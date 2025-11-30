import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AppState, DrawResult, AnalysisResponse, VideoPhase, VideoAnalysisResponse } from './types';
import { WORD_CARDS, IMAGE_CARDS } from './constants';
import Card from './components/Card';
import { analyzeOHCardStory, analyzeTextInteraction } from './services/geminiService';
import { Loader2, Sparkles, RefreshCw, Send, Video, StopCircle, PlayCircle, Download, X, Mic, CheckCircle2, ArrowRight, PenTool } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [drawResult, setDrawResult] = useState<DrawResult | null>(null);
  const [userStory, setUserStory] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Video Interaction State
  const [videoPhase, setVideoPhase] = useState<VideoPhase>(VideoPhase.IDLE);
  const [videoAnalysis1, setVideoAnalysis1] = useState<VideoAnalysisResponse | null>(null);
  const [videoAnalysis2, setVideoAnalysis2] = useState<VideoAnalysisResponse | null>(null);
  const [videoInputText, setVideoInputText] = useState(''); // Stores user manual input after video
  const [videoBlob1, setVideoBlob1] = useState<Blob | null>(null);
  const [videoBlob2, setVideoBlob2] = useState<Blob | null>(null);
  
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleDraw = useCallback(() => {
    setAppState(AppState.DRAWING);
    setDrawResult(null);
    setUserStory('');
    setAnalysis(null);
    setError(null);
    setVideoPhase(VideoPhase.IDLE);
    setVideoAnalysis1(null);
    setVideoAnalysis2(null);
    setVideoBlob1(null);
    setVideoBlob2(null);

    // Simulate shuffle delay
    setTimeout(() => {
      const randomWord = WORD_CARDS[Math.floor(Math.random() * WORD_CARDS.length)];
      const randomImage = IMAGE_CARDS[Math.floor(Math.random() * IMAGE_CARDS.length)];
      
      setDrawResult({
        word: randomWord,
        image: randomImage
      });
      setAppState(AppState.REFLECTING);
    }, 1500);
  }, []);

  const handleSubmitStory = async () => {
    if (!drawResult || !userStory.trim()) return;
    
    setAppState(AppState.ANALYZING);
    setError(null);
    
    try {
      const result = await analyzeOHCardStory(drawResult, userStory);
      if (result) {
        setAnalysis(result);
        setAppState(AppState.RESULT);
      } else {
        throw new Error("No analysis returned");
      }
    } catch (err) {
      setError("无法连接到智慧源头，请稍后再试。");
      setAppState(AppState.REFLECTING);
    }
  };

  // --- Video Logic ---

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
      setVideoPhase(VideoPhase.PREVIEW_1);
      setVideoInputText('');
    } catch (err) {
      console.error("Camera access denied:", err);
      setError("无法访问摄像头，请检查权限。");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setVideoPhase(VideoPhase.IDLE);
    setVideoInputText('');
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    
    let targetNextPhase: VideoPhase | null = null;
    let currentRound = 0;

    // Determine which recording phase we are entering AND where it should go when stopped
    if (videoPhase === VideoPhase.PREVIEW_1) {
       setVideoPhase(VideoPhase.RECORDING_1);
       targetNextPhase = VideoPhase.INPUT_1;
       currentRound = 1;
    } else if (videoPhase === VideoPhase.FEEDBACK_1) {
       setVideoPhase(VideoPhase.RECORDING_2);
       targetNextPhase = VideoPhase.INPUT_2;
       currentRound = 2;
    }
    setVideoInputText('');

    const mediaRecorder = new MediaRecorder(streamRef.current);
    mediaRecorderRef.current = mediaRecorder;
    
    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      if (currentRound === 1) setVideoBlob1(blob);
      if (currentRound === 2) setVideoBlob2(blob);

      // Use the local variable targetNextPhase to ensure we go to the correct next step
      // regardless of closure staleness
      if (targetNextPhase) {
          setVideoPhase(targetNextPhase);
      }
    };

    mediaRecorder.start();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const downloadVideo = (blob: Blob | null, filename: string) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleVideoTextSubmit = async () => {
    if (!videoInputText.trim()) return;

    try {
      if (videoPhase === VideoPhase.INPUT_1) {
        setVideoPhase(VideoPhase.ANALYZING_1);
        const result = await analyzeTextInteraction(videoInputText, {
          phase: 'round1',
          previousQuestion: analysis?.followUpQuestion || ''
        });
        if (result) {
          setVideoAnalysis1({ ...result, transcription: videoInputText });
          setVideoPhase(VideoPhase.FEEDBACK_1);
        }
      } else if (videoPhase === VideoPhase.INPUT_2) {
        setVideoPhase(VideoPhase.ANALYZING_2);
        const result = await analyzeTextInteraction(videoInputText, {
          phase: 'round2',
          previousQuestion: videoAnalysis1?.nextQuestion || '',
          previousAnswer: videoAnalysis1?.transcription
        });
        if (result) {
          setVideoAnalysis2({ ...result, transcription: videoInputText });
          setVideoPhase(VideoPhase.FINAL_FEEDBACK);
        }
      }
    } catch (err) {
      console.error("Text analysis error", err);
      setError("分析遇到问题，请重试");
      // Revert phase on error
      if (videoPhase === VideoPhase.ANALYZING_1) setVideoPhase(VideoPhase.INPUT_1);
      if (videoPhase === VideoPhase.ANALYZING_2) setVideoPhase(VideoPhase.INPUT_2);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Helper to get the current question to display
  const getCurrentQuestion = () => {
      if (videoPhase === VideoPhase.PREVIEW_1 || videoPhase === VideoPhase.RECORDING_1 || videoPhase === VideoPhase.INPUT_1 || videoPhase === VideoPhase.ANALYZING_1) {
          return analysis?.followUpQuestion;
      }
      if (videoPhase === VideoPhase.FEEDBACK_1 || videoPhase === VideoPhase.RECORDING_2 || videoPhase === VideoPhase.INPUT_2 || videoPhase === VideoPhase.ANALYZING_2) {
          return videoAnalysis1?.nextQuestion;
      }
      return null;
  };

  const isVideoActive = videoPhase !== VideoPhase.IDLE;

  return (
    // Use 100dvh to ensure it fits on mobile screens with browser bars
    <div className="h-[100dvh] w-full bg-[#f2efe9] overflow-hidden flex flex-col relative">
      
      {/* Compact Header */}
      <header className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-50 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto bg-white/50 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm">
           <div className="w-6 h-6 bg-stone-800 rounded-full flex items-center justify-center text-white font-serif text-xs">OH</div>
           <h1 className="text-base font-bold text-stone-800 tracking-wider font-serif">MindMirror</h1>
        </div>
      </header>

      {/* Main Content Area - Centered */}
      <main className="flex-1 w-full h-full flex items-center justify-center p-4 md:p-8">
        
        {/* IDLE STATE: Hero Section */}
        {appState === AppState.IDLE && (
          <div className="text-center flex flex-col items-center animate-fade-in z-10">
            <div className="mb-8 relative">
               <div className="w-32 h-48 bg-white rounded-lg shadow-xl rotate-[-6deg] absolute top-0 left-1/2 -translate-x-1/2 -z-10 border border-stone-200"></div>
               <div className="w-32 h-48 bg-stone-800 rounded-lg shadow-xl rotate-[6deg] z-0 border border-stone-600 flex items-center justify-center">
                  <Sparkles className="text-stone-400 opacity-50" size={48}/>
               </div>
            </div>
            <h2 className="text-3xl md:text-5xl font-serif text-stone-800 mb-4">
              潜意识<span className="text-stone-500 italic">投射</span>
            </h2>
            <p className="text-stone-600 mb-8 max-w-xs text-sm md:text-base leading-relaxed">
              抽一张图卡，一张字卡。<br/>看见你内心的故事。
            </p>
            <button 
              onClick={handleDraw}
              className="px-8 py-3 bg-stone-800 text-stone-100 rounded-full shadow-lg hover:scale-105 transition-transform flex items-center gap-2 text-sm md:text-base"
            >
              <Sparkles size={16} /> 开始探索
            </button>
          </div>
        )}

        {/* ACTIVE STATES: Drawing / Reflecting / Analyzing / Result */}
        {appState !== AppState.IDLE && (
          <div className="w-full max-w-5xl h-full max-h-[850px] flex flex-col md:flex-row items-center md:justify-center gap-4 md:gap-0 relative">
            
            {/* 1. THE CARDS (Visual Anchor) */}
            <div className={`
              transition-all duration-700 ease-in-out z-20
              flex items-center justify-center
              ${(appState === AppState.REFLECTING || appState === AppState.ANALYZING || appState === AppState.RESULT) 
                ? 'scale-75 md:scale-90 translate-y-4 md:translate-y-0 md:translate-x-8' 
                : 'scale-100'
              }
              ${isVideoActive ? 'hidden md:flex md:scale-75 md:-translate-x-8 opacity-50 blur-sm' : ''} 
            `}>
              {drawResult && (
                <div className="relative flex flex-row md:flex-col gap-4">
                  {/* Image Card */}
                  <div className="relative group">
                    <Card 
                      type="image" 
                      content={drawResult.image.imageUrl} 
                      revealed={appState !== AppState.DRAWING} 
                      className="w-32 h-48 md:w-56 md:h-80 shadow-2xl"
                      delay={200}
                    />
                  </div>

                  {/* Word Card */}
                  <div className="relative md:-mt-12 md:ml-12 -ml-4 mt-8 rotate-2 hover:rotate-0 transition-transform duration-300 z-30">
                    <Card 
                      type="word" 
                      content={drawResult.word.text} 
                      revealed={appState !== AppState.DRAWING} 
                      className="w-32 h-48 md:w-56 md:h-80 shadow-2xl"
                      delay={600}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 2. THE PAPER / CAMERA (Interaction Area) */}
            {appState !== AppState.DRAWING && (
              <div className={`
                flex-1 w-full z-30 transition-all duration-700 delay-300 animate-slide-up
                ${isVideoActive ? 'max-w-4xl h-[80vh]' : 'max-w-lg h-[55vh] md:h-[70vh] md:-ml-12 md:mt-8 -mt-6'}
              `}>
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-white/50 overflow-hidden flex flex-col h-full relative">
                  
                  {/* Paper Header (Hidden in video mode for immersion) */}
                  {!isVideoActive && <div className="h-1.5 w-full bg-gradient-to-r from-amber-200 via-stone-300 to-stone-200 shrink-0"></div>}
                  
                  {/* --- INPUT MODE --- */}
                  {(appState === AppState.REFLECTING || appState === AppState.ANALYZING) && (
                    <div className="p-5 md:p-8 flex flex-col h-full">
                      <div className="flex items-center gap-2 mb-3 text-stone-400 text-xs font-bold tracking-widest uppercase">
                        <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                        Your Projection
                      </div>
                      <label className="block text-stone-800 font-serif text-lg md:text-xl mb-2 leading-tight">
                        看着这两张卡，<br/>故事在如何发生？
                      </label>
                      <div className="relative flex-1 min-h-0 mt-2">
                        <textarea
                          value={userStory}
                          onChange={(e) => setUserStory(e.target.value)}
                          placeholder="描述你看到的画面..."
                          className="w-full h-full p-4 bg-[#f6f5f1] rounded-xl border-none focus:ring-1 focus:ring-stone-300 resize-none text-stone-700 placeholder:text-stone-400 text-base md:text-lg leading-relaxed custom-scrollbar"
                          disabled={appState === AppState.ANALYZING}
                        />
                      </div>
                      <div className="mt-4 flex items-center justify-between shrink-0">
                        <span className="text-xs text-stone-400">
                           {appState === AppState.ANALYZING ? "正在连接潜意识..." : "直觉书写，无需修饰"}
                        </span>
                        <button
                          onClick={handleSubmitStory}
                          disabled={!userStory.trim() || appState === AppState.ANALYZING}
                          className="bg-stone-800 text-white w-12 h-12 rounded-full flex items-center justify-center hover:bg-stone-700 hover:scale-110 transition-all shadow-lg disabled:opacity-50 disabled:hover:scale-100"
                        >
                           {appState === AppState.ANALYZING ? <Loader2 className="animate-spin" size={20}/> : <Send size={20} className="ml-0.5 mt-0.5"/>}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* --- RESULT & VIDEO MODE --- */}
                  {appState === AppState.RESULT && analysis && (
                    <>
                      {isVideoActive ? (
                        <div className="relative w-full h-full flex flex-col bg-stone-900">
                          {/* Close Video Mode */}
                          <button 
                            onClick={stopCamera} 
                            className="absolute top-4 right-4 z-50 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 p-2 rounded-full transition-all"
                          >
                            <X size={20} />
                          </button>

                          {/* Video Preview Area */}
                          <div className="flex-1 relative overflow-hidden flex items-center justify-center">
                             
                             {/* Camera Feed */}
                             {(videoPhase !== VideoPhase.FINAL_FEEDBACK) && (
                                <video 
                                  ref={videoPreviewRef} 
                                  autoPlay 
                                  playsInline 
                                  muted 
                                  className={`absolute inset-0 w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-500
                                     ${(videoPhase === VideoPhase.FEEDBACK_1 || videoPhase === VideoPhase.INPUT_1 || videoPhase === VideoPhase.INPUT_2) ? 'opacity-20 blur-md' : 'opacity-100'}
                                  `}
                                />
                             )}

                             {/* --- OVERLAYS --- */}

                             {/* 1. Question Overlay (Preview & Recording) */}
                             {(videoPhase === VideoPhase.PREVIEW_1 || videoPhase === VideoPhase.RECORDING_1 || videoPhase === VideoPhase.RECORDING_2) && (
                                <div className="absolute top-10 left-0 right-0 p-6 pointer-events-none flex justify-center z-20">
                                    <div className="bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-xl max-w-lg text-center shadow-2xl animate-fade-in-down">
                                        <div className="text-amber-300 text-xs font-bold tracking-widest uppercase mb-2 opacity-80">
                                            {videoPhase === VideoPhase.RECORDING_2 ? "深入探索" : "来自内心的提问"}
                                        </div>
                                        <h3 className="text-white font-serif text-xl md:text-2xl leading-relaxed text-shadow-lg">
                                            "{getCurrentQuestion()}"
                                        </h3>
                                    </div>
                                </div>
                             )}

                             {/* 2. Manual Input Overlay (INPUT_1 & INPUT_2) */}
                             {(videoPhase === VideoPhase.INPUT_1 || videoPhase === VideoPhase.INPUT_2) && (
                               <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-fade-in">
                                 <div className="w-full max-w-lg bg-white/95 backdrop-blur-xl rounded-2xl p-6 shadow-2xl flex flex-col max-h-[80%]">
                                   <div className="flex items-center gap-2 mb-4 text-stone-500 text-sm font-bold uppercase tracking-widest">
                                     <PenTool size={16} /> 你的回答
                                   </div>
                                   <div className="bg-stone-50 p-4 rounded-lg mb-4 text-sm text-stone-500 italic border-l-4 border-amber-300">
                                     提问: "{getCurrentQuestion()}"
                                   </div>
                                   <textarea
                                      value={videoInputText}
                                      onChange={(e) => setVideoInputText(e.target.value)}
                                      placeholder="刚刚在视频里，你说了什么？请简单记录..."
                                      className="w-full flex-1 min-h-[150px] p-4 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-400 focus:outline-none resize-none text-stone-800 text-lg leading-relaxed mb-4 custom-scrollbar"
                                   />
                                   <button 
                                      onClick={handleVideoTextSubmit}
                                      disabled={!videoInputText.trim()}
                                      className="w-full py-3 bg-stone-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                   >
                                     <Send size={18} /> 提交回答
                                   </button>
                                 </div>
                               </div>
                             )}

                             {/* 3. Analyzing State */}
                             {(videoPhase === VideoPhase.ANALYZING_1 || videoPhase === VideoPhase.ANALYZING_2) && (
                                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-30 backdrop-blur-sm">
                                     <Loader2 className="text-amber-400 animate-spin mb-4" size={48} />
                                     <p className="text-white font-serif text-lg tracking-wider animate-pulse">正在聆听你的心声...</p>
                                 </div>
                             )}

                             {/* 4. Feedback Intermission (Round 1 End) */}
                             {videoPhase === VideoPhase.FEEDBACK_1 && videoAnalysis1 && (
                                 <div className="absolute inset-0 flex flex-col items-center justify-center z-40 p-8 overflow-y-auto bg-black/40">
                                     <div className="bg-white/95 backdrop-blur-xl p-8 rounded-2xl max-w-xl w-full shadow-2xl text-center space-y-6 animate-slide-up">
                                         <div className="flex justify-center"><CheckCircle2 className="text-green-500" size={32}/></div>
                                         <div className="text-left bg-stone-50 p-4 rounded-lg border border-stone-100">
                                             <p className="text-xs text-stone-400 uppercase tracking-widest mb-1">你说了...</p>
                                             <p className="text-stone-600 italic text-sm">"{videoAnalysis1.transcription}"</p>
                                         </div>
                                         <div>
                                             <h4 className="text-amber-600 font-bold mb-2">反馈</h4>
                                             <p className="text-stone-700 leading-relaxed">{videoAnalysis1.emotionalFeedback}</p>
                                         </div>
                                         <div className="pt-4 border-t border-stone-200">
                                             <p className="text-stone-500 text-sm mb-4">准备好回答下一个问题了吗？</p>
                                             <h3 className="text-xl font-serif text-stone-900 font-bold mb-6">"{videoAnalysis1.nextQuestion}"</h3>
                                             <button 
                                                onClick={startRecording}
                                                className="w-full py-4 bg-stone-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-stone-800 transition-colors"
                                             >
                                                 <Video size={20} /> 开始第二轮录制
                                             </button>
                                         </div>
                                     </div>
                                 </div>
                             )}

                             {/* 5. Final Feedback (Round 2 End) */}
                             {videoPhase === VideoPhase.FINAL_FEEDBACK && videoAnalysis2 && (
                                 <div className="absolute inset-0 flex flex-col items-center justify-center z-40 p-8 bg-stone-900">
                                     <div className="bg-gradient-to-br from-stone-800 to-stone-900 border border-white/10 p-8 rounded-2xl max-w-xl w-full shadow-2xl text-center space-y-8 animate-fade-in">
                                         <Sparkles className="text-amber-400 mx-auto" size={48}/>
                                         <h2 className="text-3xl text-white font-serif">探索完成</h2>
                                         <div className="text-left space-y-4">
                                             <div className="bg-black/20 p-4 rounded-lg">
                                                <p className="text-xs text-stone-400 uppercase tracking-widest mb-1">最后的回应</p>
                                                <p className="text-stone-300 italic text-sm">"{videoAnalysis2.transcription}"</p>
                                             </div>
                                             <div>
                                                 <p className="text-stone-300 leading-relaxed text-lg">{videoAnalysis2.finalClosing}</p>
                                             </div>
                                         </div>
                                         
                                         {/* DOWNLOAD BUTTONS */}
                                         <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                                            {videoBlob1 && (
                                              <button 
                                                onClick={() => downloadVideo(videoBlob1, 'session-part-1.webm')}
                                                className="px-6 py-2 bg-stone-700/50 hover:bg-stone-600 text-white rounded-lg flex items-center justify-center gap-2 transition-colors border border-white/20"
                                              >
                                                <Download size={16} /> 保存视频 1
                                              </button>
                                            )}
                                            {videoBlob2 && (
                                              <button 
                                                onClick={() => downloadVideo(videoBlob2, 'session-part-2.webm')}
                                                className="px-6 py-2 bg-stone-700/50 hover:bg-stone-600 text-white rounded-lg flex items-center justify-center gap-2 transition-colors border border-white/20"
                                              >
                                                <Download size={16} /> 保存视频 2
                                              </button>
                                            )}
                                         </div>

                                         <button 
                                            onClick={stopCamera}
                                            className="px-8 py-3 bg-white text-stone-900 rounded-full font-bold hover:bg-stone-200 transition-colors mt-4"
                                         >
                                             结束旅程
                                         </button>
                                     </div>
                                 </div>
                             )}

                          </div>

                          {/* Recording Controls Footer (Only visible during Preview/Recording) */}
                          {(videoPhase === VideoPhase.PREVIEW_1 || videoPhase === VideoPhase.RECORDING_1 || videoPhase === VideoPhase.RECORDING_2) && (
                              <div className="h-24 bg-stone-900/90 backdrop-blur flex items-center justify-center gap-8 shrink-0 border-t border-white/10 z-50">
                                 {(videoPhase === VideoPhase.RECORDING_1 || videoPhase === VideoPhase.RECORDING_2) ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <button 
                                            onClick={stopRecording}
                                            className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center bg-red-600 hover:bg-red-700 transition-all animate-pulse shadow-[0_0_20px_rgba(220,38,38,0.5)]"
                                        >
                                            <div className="w-6 h-6 bg-white rounded-sm"></div>
                                        </button>
                                        <span className="text-white text-xs font-mono animate-pulse">正在录制...</span>
                                    </div>
                                 ) : (
                                    <button 
                                        onClick={startRecording}
                                        className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center hover:bg-white/10 transition-all group"
                                    >
                                        <div className="w-12 h-12 bg-red-500 rounded-full group-hover:scale-90 transition-transform"></div>
                                    </button>
                                 )}
                              </div>
                          )}
                        </div>
                      ) : (
                        /* --- TEXT RESULT MODE --- */
                        <div className="flex flex-col h-full relative">
                          <div className="absolute top-0 right-0 p-4 z-10">
                            <button onClick={handleDraw} className="bg-stone-100 p-2 rounded-full text-stone-500 hover:bg-stone-200 hover:text-stone-800 transition-colors" title="重抽">
                              <RefreshCw size={16} />
                            </button>
                          </div>

                          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 space-y-6">
                            <div>
                              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">故事</h3>
                              <p className="text-stone-600 text-sm italic border-l-2 border-stone-200 pl-3">
                                {analysis.summary}
                              </p>
                            </div>

                            <div>
                              <h3 className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-1">
                                <Sparkles size={12}/> 深度解读
                              </h3>
                              <div className="text-stone-800 text-base md:text-lg leading-relaxed font-serif text-justify">
                                {analysis.interpretation}
                              </div>
                            </div>

                            <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
                              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">引导</h3>
                              <p className="text-stone-700 text-sm font-medium leading-relaxed">
                                {analysis.guidance}
                              </p>
                            </div>
                          </div>
                          
                          {/* Footer Action to Switch to Video */}
                          <div className="p-4 border-t border-stone-100 bg-white flex justify-center shrink-0">
                             <button 
                               onClick={startCamera}
                               className="flex items-center gap-2 bg-gradient-to-r from-stone-800 to-stone-700 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-sm font-bold tracking-wide"
                             >
                                <Video size={18} />
                                开启深度视频对话
                             </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  
                </div>
                {!isVideoActive && <div className="h-2 mx-4 bg-white/40 rounded-b-lg backdrop-blur-sm"></div>}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Subtle Background */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40">
         <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white to-transparent"></div>
         <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-amber-100/20 rounded-full blur-[100px]"></div>
      </div>
    </div>
  );
};

export default App;