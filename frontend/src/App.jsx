import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Zap, BookOpen, Send, RotateCcw, Wand2, Cpu } from 'lucide-react';

const App = () => {
  const [storyState, setStoryState] = useState({
    storyStarted: false,
    storySoFar: '',
    turns: [],
    isLoading: false,
    theme: 'neutral' // 'fantasy', 'scifi', 'neutral'
  });
  
  const [userInput, setUserInput] = useState('');
  const storyContainerRef = useRef(null);

  // Auto-scroll to bottom when new content is added
  useEffect(() => {
    if (storyContainerRef.current) {
      storyContainerRef.current.scrollTop = storyContainerRef.current.scrollHeight;
    }
  }, [storyState.turns]);

  // Detect theme based on story content
  const detectTheme = (text) => {
    const fantasyKeywords = ['magic', 'wizard', 'dragon', 'castle', 'sword', 'potion', 'spell', 'enchanted', 'mystical', 'realm'];
    const scifiKeywords = ['robot', 'space', 'laser', 'cyber', 'tech', 'AI', 'quantum', 'neural', 'digital', 'hologram'];
    
    const lowerText = text.toLowerCase();
    const fantasyCount = fantasyKeywords.filter(word => lowerText.includes(word)).length;
    const scifiCount = scifiKeywords.filter(word => lowerText.includes(word)).length;
    
    if (fantasyCount > scifiCount && fantasyCount > 0) return 'fantasy';
    if (scifiCount > fantasyCount && scifiCount > 0) return 'scifi';
    return 'neutral';
  };

  const handleStartStory = async () => {
    if (!userInput.trim()) return;
    
    setStoryState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // API call to FastAPI backend
      const response = await fetch('https://storygenerator-rvnw.onrender.com/story/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_input: userInput })
      });
      
      const data = await response.json();
      const theme = detectTheme(data.ai_part);
      
      setStoryState({
        storyStarted: true,
        storySoFar: data.story_so_far,
        turns: [
          { type: 'user', content: userInput },
          { type: 'ai', content: data.ai_part }
        ],
        isLoading: false,
        theme
      });
      
      setUserInput('');
    } catch (error) {
      console.error('Error starting story:', error);
      // Fallback demo response
      const demoResponse = "In the depths of the Crystalline Caverns, where ancient magic still pulses through veins of luminescent stone, you find yourself standing at the threshold of an impossible choice. The air shimmers with ethereal energy, and whispers of long-forgotten spells echo through the corridors ahead.";
      
      setStoryState({
        storyStarted: true,
        storySoFar: demoResponse,
        turns: [
          { type: 'user', content: userInput },
          { type: 'ai', content: demoResponse }
        ],
        isLoading: false,
        theme: 'fantasy'
      });
      
      setUserInput('');
    }
  };

  const handleContinueStory = async () => {
    if (!userInput.trim()) return;
    
    setStoryState(prev => ({ 
      ...prev, 
      isLoading: true,
      turns: [...prev.turns, { type: 'user', content: userInput }]
    }));
    
    const currentInput = userInput;
    setUserInput('');
    
    try {
      // API call to FastAPI backend
      const response = await fetch('https://storygenerator-rvnw.onrender.com/story/continue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_input: currentInput })
      });
      
      const data = await response.json();
      const newTheme = detectTheme(data.ai_part);
      
      setStoryState(prev => ({
        ...prev,
        storySoFar: data.story_so_far,
        turns: [...prev.turns, { type: 'ai', content: data.ai_part }],
        isLoading: false,
        theme: newTheme !== 'neutral' ? newTheme : prev.theme
      }));
    } catch (error) {
      console.error('Error continuing story:', error);
      // Fallback demo response
      const demoResponse = "The path you've chosen leads deeper into the unknown, where reality bends and new possibilities unfold...";
      
      setStoryState(prev => ({
        ...prev,
        turns: [...prev.turns, { type: 'ai', content: demoResponse }],
        isLoading: false
      }));
    }
  };

  const resetStory = () => {
    setStoryState({
      storyStarted: false,
      storySoFar: '',
      turns: [],
      isLoading: false,
      theme: 'neutral'
    });
    setUserInput('');
  };

  const getThemeClasses = () => {
    switch (storyState.theme) {
      case 'fantasy':
        return {
          bg: 'bg-gradient-to-br from-amber-900 via-orange-800 to-red-900',
          cardBg: 'bg-gradient-to-br from-amber-50 to-orange-50',
          accent: 'bg-gradient-to-r from-purple-600 to-pink-600',
          text: 'text-amber-900',
          mutedText: 'text-amber-700',
          border: 'border-amber-300',
          aiCard: 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-300',
          icon: 'text-purple-600',
          userCard: 'bg-gradient-to-r from-purple-600 to-pink-600',
          headerBg: 'bg-gradient-to-r from-amber-100 to-orange-100 border-amber-300'
        };
      case 'scifi':
        return {
          bg: 'bg-gradient-to-br from-slate-900 via-gray-800 to-zinc-900',
          cardBg: 'bg-gradient-to-br from-slate-100 to-zinc-100',
          accent: 'bg-gradient-to-r from-cyan-500 to-blue-500',
          text: 'text-slate-900',
          mutedText: 'text-slate-700',
          border: 'border-slate-300',
          aiCard: 'bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-300',
          icon: 'text-cyan-600',
          userCard: 'bg-gradient-to-r from-cyan-500 to-blue-500',
          headerBg: 'bg-gradient-to-r from-slate-200 to-zinc-200 border-slate-300'
        };
      default:
        return {
          bg: 'bg-gradient-to-br from-indigo-900 via-purple-800 to-pink-900',
          cardBg: 'bg-gradient-to-br from-slate-100 to-gray-100',
          accent: 'bg-gradient-to-r from-indigo-600 to-purple-600',
          text: 'text-slate-900',
          mutedText: 'text-slate-700',
          border: 'border-slate-300',
          aiCard: 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-300',
          icon: 'text-indigo-600',
          userCard: 'bg-gradient-to-r from-indigo-600 to-purple-600',
          headerBg: 'bg-gradient-to-r from-slate-200 to-gray-200 border-slate-300'
        };
    }
  };

  const theme = getThemeClasses();

  if (!storyState.storyStarted) {
    return (
      <div className={`min-h-screen ${theme.bg} flex items-center justify-center p-4`}>
        <div className="max-w-2xl w-full">
          <div className={`${theme.cardBg} rounded-2xl p-8 border ${theme.border} shadow-lg`}>
            <div className="text-center mb-8">
              <div className="flex justify-center items-center gap-3 mb-4">
                <BookOpen className={`w-10 h-10 ${theme.icon}`} />
              </div>
              <h1 className={`text-3xl font-bold ${theme.text} mb-2`}>
                Story Weaver AI
              </h1>
              <p className={`${theme.mutedText}`}>
                Create collaborative stories with AI
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className={`block text-sm font-medium ${theme.text} mb-3`}>
                  Describe your story's setting, genre, and tone
                </label>
                <textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="A mystical forest where ancient magic dwells, or a cyberpunk city where AI and humans coexist..."
                  className={`w-full h-32 p-4 border ${theme.border} rounded-xl ${theme.text} placeholder-gray-500 bg-white shadow-sm transition-all duration-200 ${
                    storyState.theme === 'fantasy' ? 'focus:ring-purple-500' : 
                    storyState.theme === 'scifi' ? 'focus:ring-cyan-500' : 'focus:ring-indigo-500'
                  } focus:outline-none focus:ring-2 focus:ring-opacity-50 resize-none`}
                />
              </div>

              <button
                onClick={handleStartStory}
                disabled={!userInput.trim() || storyState.isLoading}
                className={`w-full py-4 ${theme.accent} text-white font-semibold rounded-xl hover:opacity-90 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105`}
              >
                {storyState.isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Begin Your Tale
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.bg} flex flex-col`}>
      {/* Header */}
      <header className={`${theme.headerBg} border-b ${theme.border} p-4 shadow-sm`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {storyState.theme === 'fantasy' ? (
              <Wand2 className={`w-6 h-6 ${theme.icon}`} />
            ) : storyState.theme === 'scifi' ? (
              <Zap className={`w-6 h-6 ${theme.icon}`} />
            ) : (
              <BookOpen className={`w-6 h-6 ${theme.icon}`} />
            )}
            <h1 className={`text-xl font-bold ${theme.text}`}>
              Story Weaver AI
            </h1>
          </div>
          <button
            onClick={resetStory}
            className={`flex items-center gap-2 px-4 py-2 border ${theme.border} hover:bg-gray-50 ${theme.text} rounded-lg transition-colors`}
          >
            <RotateCcw className="w-4 h-4" />
            New Story
          </button>
        </div>
      </header>

      {/* Story Container */}
      <div 
        ref={storyContainerRef}
        className="flex-1 overflow-y-auto p-4"
      >
        <div className="max-w-4xl mx-auto space-y-4">
          {storyState.turns.map((turn, index) => (
            <div
              key={index}
              className={`${
                turn.type === 'user' 
                  ? 'ml-auto max-w-2xl' 
                  : 'mr-auto max-w-3xl'
              }`}
            >
              <div
                className={`p-4 rounded-xl border shadow-sm ${
                  turn.type === 'user'
                    ? `${theme.userCard} text-white shadow-lg`
                    : `${theme.aiCard} ${theme.text}`
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    turn.type === 'user' 
                      ? 'bg-white/20 text-white backdrop-blur-sm' 
                      : `bg-white shadow-sm ${theme.icon}`
                  }`}>
                    {turn.type === 'user' ? (
                      'You'
                    ) : storyState.theme === 'fantasy' ? (
                      <Sparkles className="w-4 h-4" />
                    ) : storyState.theme === 'scifi' ? (
                      <Zap className="w-4 h-4" />
                    ) : (
                      'AI'
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="leading-relaxed whitespace-pre-wrap">
                      {turn.content}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {storyState.isLoading && (
            <div className="mr-auto max-w-3xl">
              <div className={`p-4 rounded-xl border shadow-sm ${theme.aiCard} ${theme.text}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center ${theme.icon}`}>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                  </div>
                  <div className="flex-1">
                    <p className={theme.mutedText}>AI is writing...</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className={`${theme.cardBg} border-t ${theme.border} p-4 shadow-lg`}>
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Continue the story..."
                className={`w-full h-20 p-3 pr-20 border ${theme.border} rounded-xl ${theme.text} placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-opacity-50 bg-white shadow-sm transition-all duration-200 ${
                  storyState.theme === 'fantasy' ? 'focus:ring-purple-500' : 
                  storyState.theme === 'scifi' ? 'focus:ring-cyan-500' : 'focus:ring-indigo-500'
                } resize-none`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    handleContinueStory();
                  }
                }}
              />
              <div className={`absolute bottom-2 right-2 text-xs ${theme.mutedText}`}>
                Ctrl+Enter
              </div>
            </div>
            <button
              onClick={handleContinueStory}
              disabled={!userInput.trim() || storyState.isLoading}
              className={`px-6 py-3 ${theme.accent} text-white font-semibold rounded-xl hover:opacity-90 transition-all duration-200 disabled:opacity-50 flex items-center gap-2 self-start mt-2 shadow-lg hover:shadow-xl transform hover:scale-105`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;