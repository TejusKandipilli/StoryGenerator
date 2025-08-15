from fastapi import FastAPI
from pydantic import BaseModel
from typing import Dict
from dotenv import load_dotenv
import os
from fastapi.middleware.cors import CORSMiddleware
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
        "-Establish the world and its history and set up the current events"
        "- Keep it under 200 words.\n"
        "- Do not explicitly label genre, setting, or tone — just show them through the prose.\n"
        "User's input: {user_input}\n\n"
        "Story so far:"
    )
)

continue_story_prompt = PromptTemplate(
input_variables=["story_so_far", "user_input"],
template=(
"You are a skilled fiction writer.\n\n"
"Context (existing story):\n"
"{story_so_far}\n\n"
"New input from the reader:\n"
"{user_input}\n\n"
"Your task:\n"
"- Continue the story naturally from the context, keeping the established voice, tone, POV, tense, and pacing consistent.\n"
"- Maintain continuity of characters, setting, stakes, and facts already introduced.\n"
"- Show, don’t tell: use vivid sensory detail, concrete actions, and lively dialogue.\n"
"- Advance at least one thread (character goal, obstacle, or mystery) so the scene feels meaningful—not just filler.\n"
"- Keep the prose coherent and fluid; avoid abrupt time jumps unless clearly signposted.\n"
"- If the reader’s input conflicts with continuity, resolve it gracefully in-world (e.g., via character misunderstanding or correction) rather than overriding prior facts.\n"
"- Keep the writing safe for work and avoid explicit content unless the context already established it and it serves the narrative.\n"
"- End on a compelling, open beat (a decision pending, a door about to open, a new clue revealed) that invites the next continuation without forcing a cliffhanger.\n\n"
"Constraints:\n"
"- Length: 4-6 paragraphs, each 2–5 sentences (adjust naturally if action/dialogue requires shorter beats).\n"
"- Do not summarize; write forward-moving narrative prose.\n"
"- Do not rewrite or contradict the provided context.\n"
"- Do not include author notes, analysis, or instructions—only the story continuation.\n\n"
"Now write the continuation."
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://story-generator-murex.vercel.app/","http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
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

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port)