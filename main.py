from fastapi import FastAPI
from pydantic import BaseModel
from typing import Dict
from dotenv import load_dotenv
import os

from langchain.prompts import PromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, START

# --- Load Environment Variables ---
load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# --- LangChain LLM Wrapper ---
llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", api_key=GOOGLE_API_KEY)

# --- State ---
class State(Dict):
    story_so_far: str
    user_input: str
    answer: str

# --- Prompt Templates ---
story_so_far_prompt = PromptTemplate(
    input_variables=["user_input"],
    template=(
        "You are a skilled storyteller across all genres.\n"
        "Based solely on the user's input, infer:\n"
        "1. The likely genre.\n"
        "2. The setting (place, time, atmosphere).\n"
        "3. The tone.\n\n"
        "Then write a vivid and immersive 'Story So Far' as the opening scene.\n"
        "- Keep it under 200 words.\n"
        "- Do not explicitly label genre, setting, or tone — just show them through the prose.\n"
        "User's input: {user_input}\n\n"
        "Story so far:"
    )
)

continue_story_prompt = PromptTemplate(
    input_variables=["story_so_far", "user_input"],
    template=(
        "Story so far:\n{story_so_far}\n\n"
        "User continues: {user_input}\n\n"
        "Continue the story from this point, keeping the style and tone consistent. "
        "Write in a vivid, engaging way and make sure it flows naturally from the previous part."
    )
)

# --- Graph 1: Start Story ---
def start_story(state: State) -> State:
    response = llm.invoke(story_so_far_prompt.format(user_input=state["user_input"]))
    return {"story_so_far": response.content.strip(), "answer": response.content.strip()}

graph_builder_start = StateGraph(State)
graph_builder_start.add_node("start_story", start_story)
graph_builder_start.add_edge(START, "start_story")
graph_start = graph_builder_start.compile()

# --- Graph 2: Continue Story ---
def continue_story(state: State) -> State:
    response = llm.invoke(
        continue_story_prompt.format(
            story_so_far=state["story_so_far"],
            user_input=state["user_input"]
        )
    )
    updated_story = f"{state['story_so_far']} {response.content.strip()}"
    return {"story_so_far": updated_story, "answer": response.content.strip()}

graph_builder_continue = StateGraph(State)
graph_builder_continue.add_node("continue_story", continue_story)
graph_builder_continue.add_edge(START, "continue_story")
graph_continue = graph_builder_continue.compile()

# --- FastAPI App ---
app = FastAPI(title="AI Story Generator with LangGraph + Gemini")

# --- Persistent Story State (for demo) ---
state: State = {"story_so_far": "", "answer": "", "user_input": ""}

# --- Request Models ---
class StoryRequest(BaseModel):
    user_input: str

# --- Helper Function ---
def run_graph(graph, user_input: str) -> Dict:
    global state
    result = graph.invoke(
        {"user_input": user_input, "story_so_far": state["story_so_far"], "answer": ""},
        start_at=START
    )
    state.update(result)
    return {"story_so_far": state["story_so_far"], "ai_part": state["answer"]}

# --- Endpoints ---
@app.post("/story/start")
def start_story_endpoint(req: StoryRequest) -> Dict:
    state["story_so_far"] = ""  # reset for new story
    return run_graph(graph_start, req.user_input)

@app.post("/story/continue")
def continue_story_endpoint(req: StoryRequest) -> Dict:
    return run_graph(graph_continue, req.user_input)
