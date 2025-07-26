"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Volume2, VolumeX, Settings, Sparkles, ArrowLeft, MessageCircle, Brain, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";



// CSS per scrollbar personalizzata
const scrollbarStyles = `
  .custom-scrollbar {
    scrollbar-width: thin;
    -ms-overflow-style: none;
    overflow-y: scroll !important;
  }
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 10px;
    margin: 4px 0;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, rgba(147, 51, 234, 0.6) 0%, rgba(236, 72, 153, 0.6) 100%);
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, rgba(147, 51, 234, 0.8) 0%, rgba(236, 72, 153, 0.8) 100%);
    box-shadow: 0 4px 12px rgba(147, 51, 234, 0.3);
    transform: scale(1.1);
  }
  
  /* Assicura che non ci sia mai spazio bianco */
  body, html {
    background: linear-gradient(135deg, #0f172a 0%, #581c87 50%, #0f172a 100%);
    overflow: hidden;
    margin: 0;
    padding: 0;
  }
  
  /* Container chat con altezza fissa - ARRIVA FINO IN FONDO */
  .chat-container {
    height: 100vh;
    max-height: 100vh;
    overflow: hidden;
    margin: 0;
    padding: 0;
  }
  
  /* Area messaggi con scroll interno - ARRIVA FINO IN FONDO */
  .messages-area {
    flex: 1;
    min-height: 0;
    overflow-y: scroll !important;
    height: calc(100vh - 200px) !important;
    max-height: calc(100vh - 200px) !important;
  }
  
  /* Assicura che il contenuto interno possa espandersi */
  .messages-area > div {
    min-height: 100%;
  }
`;

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isVoice?: boolean;
}

const DockyPage: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [wakeWordDetected, setWakeWordDetected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isMicrophoneEnabled, setIsMicrophoneEnabled] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isButtonPressed, setIsButtonPressed] = useState(false);
  const [pendingQuery, setPendingQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [avatarState, setAvatarState] = useState<'idle' | 'speaking' | 'listening' | 'thinking' | 'blinking'>('idle');
  const [blinkTimer, setBlinkTimer] = useState<NodeJS.Timeout | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);



  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
    }
  }, [messages]);

  // Animazioni avatar in pausa (sbattere occhi, sorriso)
  useEffect(() => {
    const startBlinkAnimation = () => {
      if (blinkTimer) clearTimeout(blinkTimer);
      
      const blink = () => {
        if (avatarState === 'idle') {
          setAvatarState('blinking');
          setTimeout(() => setAvatarState('idle'), 200);
        }
        const nextBlink = Math.random() * 3000 + 2000; // 2-5 secondi
        const timer = setTimeout(blink, nextBlink);
        setBlinkTimer(timer);
      };
      
      blink();
    };
    
    if (avatarState === 'idle') {
      startBlinkAnimation();
    }
    
    return () => {
      if (blinkTimer) clearTimeout(blinkTimer);
    };
  }, [avatarState, blinkTimer]);

  // Messaggio di benvenuto automatico
  useEffect(() => {
    if (isInitialized && messages.length === 0) {
      const welcomeMessage = "Benvenuto! Sono DOCKY, il tuo assistente vocale intelligente. Tieni premuto il pulsante microfono per parlare, poi rilascia per elaborare la domanda. Cercherò nella mia memoria e ti risponderò quanto prima!";
      const assistantMessage: Message = {
        id: Date.now().toString(),
        type: 'assistant',
        content: welcomeMessage,
        timestamp: new Date(),
        isVoice: true
      };
      setMessages([assistantMessage]);
      
      // Aspetta che la sintesi vocale sia pronta e poi parla
      const speakWelcome = () => {
        if (synthesisRef.current && synthesisRef.current.getVoices().length > 0) {
          console.log('🎤 Presentazione vocale di DOCKY...');
          speakResponse(welcomeMessage);
        } else {
          console.log('🎤 Sintesi vocale non ancora pronta, riprovo...');
          setTimeout(speakWelcome, 500);
        }
      };
      
      // Aspetta un momento per permettere alla sintesi vocale di inizializzarsi
      setTimeout(speakWelcome, 1500);
    }
  }, [isInitialized, messages.length]);

  // Inizializza il riconoscimento vocale
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'it-IT';
      
      // Migliora il riconoscimento delle prime parole
      recognitionRef.current.maxAlternatives = 3;
      
      recognitionRef.current.onstart = () => {
        console.log('🎤 Riconoscimento vocale attivato - isButtonPressed:', isButtonPressed);
        setIsListening(true);
      };
      
      // Abilita automaticamente il microfono all'apertura
      const autoEnableMicrophone = async () => {
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
          setIsMicrophoneEnabled(true);
          console.log('🎤 Microfono abilitato automaticamente');
        } catch (error) {
          console.log('❌ Microfono non autorizzato automaticamente');
          setIsMicrophoneEnabled(false);
        }
      };
      
      // Prova ad abilitare il microfono automaticamente
      autoEnableMicrophone();
      
      recognitionRef.current.onresult = (event: any) => {
        // Ignora l'input se DOCKY sta parlando per evitare feedback loop
        if (isSpeaking) {
          console.log('🎤 Input ignorato - DOCKY sta parlando');
          return;
        }
        
        // Se il pulsante non è premuto, salva comunque il transcript per il fallback
        if (!isButtonPressed) {
          console.log('🎤 Input ricevuto dopo rilascio pulsante - salvo per fallback');
        }
        
        let finalTranscript = '';
        let interimTranscript = '';
        
        // Accumula tutti i risultati per catturare meglio l'inizio
        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        const fullTranscript = finalTranscript + interimTranscript;
        setTranscript(fullTranscript);
        
        // Salva sempre la query finale se disponibile
        if (finalTranscript.trim()) {
          setPendingQuery(finalTranscript);
          console.log('🎤 Query finale salvata:', finalTranscript);
        }
        
        // Mostra sempre il transcript completo
        console.log('🎤 Transcript completo:', fullTranscript);
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('❌ Errore riconoscimento vocale:', event.error);
        
        // Gestisci diversi tipi di errori
        switch (event.error) {
          case 'not-allowed':
          toast.error('Microfono non autorizzato. Abilita il microfono per usare DOCKY.');
          setIsMicrophoneEnabled(false);
            setIsListening(false);
            break;
          case 'no-speech':
            // Questo è normale, non è un errore critico
            console.log('🎤 Nessun audio rilevato, continuo ad ascoltare...');
            break;
          case 'audio-capture':
            toast.error('Problema con il microfono. Verifica che sia collegato e funzionante.');
            setIsListening(false);
            break;
          case 'network':
            toast.error('Problema di connessione. Verifica la tua connessione internet.');
            setIsListening(false);
            break;
          default:
            console.log('🎤 Errore riconoscimento vocale non critico:', event.error);
            break;
        }
      };
      
      recognitionRef.current.onend = () => {
        console.log('🎤 Riconoscimento vocale terminato');
        setIsListening(false);
        setWakeWordDetected(false);
        
        // Salva il transcript finale se il pulsante è stato rilasciato
        if (!isButtonPressed && transcript.trim()) {
          console.log('🎤 Salvataggio transcript finale:', transcript);
          setPendingQuery(transcript);
        }
        
        // Non riavviare automaticamente l'ascolto - aspetta che l'utente prema il pulsante
      };
    }
    
    // Inizializza la sintesi vocale
    synthesisRef.current = window.speechSynthesis;
    
    // Debug: mostra tutte le voci disponibili
    setTimeout(() => {
      const voices = synthesisRef.current?.getVoices() || [];
      console.log('🎤 Voci disponibili nel browser:');
      voices.forEach((voice, index) => {
        console.log(`${index + 1}. ${voice.name} (${voice.lang}) - ${voice.default ? 'DEFAULT' : ''}`);
      });
    }, 1000);
    
    setIsInitialized(true);
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (utteranceRef.current) {
        synthesisRef.current?.cancel();
      }
    };
  }, []);

  // Gestisce le query vocali
  const handleVoiceQuery = async (query: string) => {
    if (!query.trim()) return;
    
    setIsProcessing(true);
    setAvatarState('thinking');
    
    // Aggiungi messaggio utente
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: query,
      timestamp: new Date(),
      isVoice: true
    };
    setMessages(prev => [...prev, userMessage]);
    
    // Aggiungi messaggio di processing
    const processingMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      content: '🔍 DOCKY sta cercando nei tuoi documenti...',
      timestamp: new Date(),
      isVoice: false
    };
    setMessages(prev => [...prev, processingMessage]);
    
    try {
      console.log('🔍 Query vocale:', query);
      console.log('🌍 URL API:', window.location.origin + '/api/voice-search');
      
      // Chiamata API per cercare in tutti i PDF
      const response = await fetch('/api/voice-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });
      
      console.log('📡 Status risposta:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Errore API:', errorText);
        throw new Error(`Errore nella ricerca vocale: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('🎯 Risposta vocale:', data);
      console.log('📄 Contenuto risposta:', data.answer);
      console.log('📚 Fonti:', data.sources);
      
      // Rimuovi il messaggio di processing
      setMessages(prev => prev.filter(msg => msg.content !== '🔍 DOCKY sta cercando nei tuoi documenti...'));
      
      // Aggiungi messaggio assistente
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.answer,
        timestamp: new Date(),
        isVoice: true
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Leggi la risposta ad alta voce
      speakResponse(data.answer);
      
    } catch (error) {
      console.error('❌ Errore query vocale:', error);
      
      // Rimuovi il messaggio di processing
      setMessages(prev => prev.filter(msg => msg.content !== '🔍 DOCKY sta cercando nei tuoi documenti...'));
      
      // Non scrivere errori nella chat, solo log
      let errorMessage = 'Non ho capito bene, puoi ripetere?';
      
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          errorMessage = 'Devi essere loggato per usare DOCKY. Fai il login e riprova.';
        } else if (error.message.includes('404')) {
          errorMessage = 'Utente non trovato. Fai il login di nuovo.';
        } else if (error.message.includes('500')) {
          errorMessage = 'Errore del server. Riprova tra qualche secondo.';
        } else if (error.message.includes('fetch failed')) {
          errorMessage = 'Problema di connessione. Verifica la tua connessione internet.';
        }
      }
      
      // Solo parla l'errore, non scriverlo nella chat
      speakResponse(errorMessage);
    } finally {
      setIsProcessing(false);
      setAvatarState('idle');
    }
  };

  // Funzione per leggere la risposta ad alta voce (voce professionale moderna)
  const speakResponse = (text: string) => {
    if (!synthesisRef.current) return;
    
    // Cancella eventuali sintesi precedenti
    synthesisRef.current.cancel();
    
    utteranceRef.current = new SpeechSynthesisUtterance(text);
    utteranceRef.current.lang = 'it-IT';
    utteranceRef.current.rate = 1.0; // Velocità naturale
    utteranceRef.current.pitch = 0.95; // Tono leggermente più basso e professionale
    utteranceRef.current.volume = 1.0; // Volume massimo
    
    // Pulisci il testo per la sintesi vocale
    let cleanText = text;
    
    // Rimuovi caratteri strani che non devono essere pronunciati
    cleanText = cleanText.replace(/[-_*+=\[\]{}()<>|\\\/@#$%^&~`]/g, ' ');
    
    // Rimuovi spazi multipli
    cleanText = cleanText.replace(/\s+/g, ' ');
    
    // Impostazioni per evitare la sillabazione delle maiuscole
    cleanText = cleanText.replace(/([A-Z])/g, (match) => match.toLowerCase());
    
    utteranceRef.current.text = cleanText;
    
    // Aspetta che le voci siano caricate
    const setVoice = () => {
      const voices = synthesisRef.current?.getVoices() || [];
      
      // Cerca la voce più professionale e naturale disponibile
      const professionalVoice = voices.find(voice => 
        voice.lang.includes('it') && voice.name.includes('Premium')
      ) || voices.find(voice => 
        voice.lang.includes('it') && voice.name.includes('Enhanced')
      ) || voices.find(voice => 
        voice.lang.includes('it') && voice.name.includes('Natural')
      ) || voices.find(voice => 
        voice.lang.includes('it') && voice.name.includes('Neural')
      ) || voices.find(voice => 
        voice.lang.includes('it') && voice.name.includes('Samantha')
      ) || voices.find(voice => 
        voice.lang.includes('it') && voice.name.includes('Victoria')
      ) || voices.find(voice => 
        voice.lang.includes('it') && voice.name.includes('Karen')
      ) || voices.find(voice => 
      voice.lang.includes('it') && voice.name.includes('Google')
      ) || voices.find(voice => 
        voice.lang.includes('it') && voice.name.includes('Microsoft')
    ) || voices.find(voice => voice.lang.includes('it'));
      
      if (professionalVoice) {
        utteranceRef.current!.voice = professionalVoice;
        console.log('🎤 Voce professionale selezionata:', professionalVoice.name);
      } else {
        console.log('🎤 Nessuna voce professionale trovata, uso quella di default');
        console.log('🎤 Voci disponibili:', voices.map(v => `${v.name} (${v.lang})`));
      }
    };
    
    // Se le voci sono già caricate
    if (synthesisRef.current.getVoices().length > 0) {
      setVoice();
    } else {
      // Aspetta che le voci siano caricate
      synthesisRef.current.onvoiceschanged = setVoice;
    }
    
    utteranceRef.current.onstart = () => {
      setIsSpeaking(true);
      setAvatarState('speaking');
      console.log('🔊 Iniziando sintesi vocale');
      
      // Non serve fermare l'ascolto perché ora è controllato dal pulsante
    };
    
    utteranceRef.current.onend = () => {
      setIsSpeaking(false);
      setAvatarState('idle');
      console.log('🔊 Sintesi vocale completata');
      
      // Non riavviare l'ascolto automaticamente - aspetta che l'utente prema il pulsante
    };
    
    utteranceRef.current.onerror = (event) => {
      console.error('❌ Errore sintesi vocale:', event);
      setIsSpeaking(false);
    };
    
    synthesisRef.current.speak(utteranceRef.current);
  };

  // Abilita il microfono
  const enableMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop immediatamente
      setIsMicrophoneEnabled(true);
      toast.success('Microfono abilitato! Ora puoi parlare con DOCKY.');
    } catch (error) {
      console.error('Errore abilitazione microfono:', error);
      toast.error('Impossibile abilitare il microfono. Verifica i permessi del browser.');
      setIsMicrophoneEnabled(false);
    }
  };

  // Ferma la sintesi vocale
  const stopSpeaking = () => {
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
      setIsSpeaking(false);
      setAvatarState('idle');
    }
  };

  // Pulisci la chat
  const clearChat = () => {
    setMessages([]);
    toast.success('Chat pulita!');
  };

    // Componente Avatar Placeholder
  const DockyAvatar = () => {
    return (
      <div className="relative w-32 h-40 md:w-36 md:h-44 lg:w-40 lg:h-48 mx-auto">
        {/* Avatar Placeholder */}
        <div className="w-full h-full rounded-full overflow-hidden border-2 border-purple-400 shadow-xl bg-gradient-to-br from-purple-900/20 to-indigo-900/20 backdrop-blur-sm">
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-purple-300 text-center">
              <div className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 mx-auto mb-2 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
                <svg className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="text-xs font-medium">DOCKY</div>
              <div className="text-xs opacity-75">AI Assistant</div>
            </div>
          </div>


        </div>


      </div>
    );
  };

  const handleButtonPress = () => {
    console.log('🎤 Pulsante premuto - stato microfono:', isMicrophoneEnabled);
    
    // Ferma immediatamente tutto quello che sta facendo
    if (isSpeaking) {
      console.log('🎤 Fermando sintesi vocale...');
      stopSpeaking();
    }
    
    if (isProcessing) {
      console.log('🎤 Fermando elaborazione...');
      setIsProcessing(false);
    }
    
    if (!isMicrophoneEnabled) {
      console.log('🎤 Abilitando microfono...');
      enableMicrophone();
      return;
    }
    
    setIsButtonPressed(true);
    setAvatarState('listening');
    setPendingQuery('');
    setTranscript('');
    
    // Avvia l'ascolto
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        console.log('🎤 Ascolto avviato - pulsante premuto');
      } catch (error) {
        console.log('🎤 Errore nell\'avvio ascolto:', error);
      }
    } else {
      console.log('🎤 Ascolto già attivo o recognition non disponibile');
    }
  };

  // Gestisce il rilascio del pulsante
  const handleButtonRelease = () => {
    console.log('🎤 Pulsante rilasciato - pendingQuery:', pendingQuery, 'transcript:', transcript);
    
    // Ferma immediatamente l'ascolto PRIMA di cambiare lo stato
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
        console.log('🎤 Ascolto fermato - pulsante rilasciato');
      } catch (error) {
        console.log('🎤 Errore nel fermare ascolto:', error);
      }
    }
    
    // Cambia lo stato dopo aver fermato l'ascolto
    setIsButtonPressed(false);
    setAvatarState('thinking');
    
    // Aspetta un momento per permettere al riconoscimento di terminare
    setTimeout(() => {
      // Usa pendingQuery se disponibile, altrimenti usa transcript
      const queryToProcess = pendingQuery.trim() || transcript.trim();
      
      console.log('🎤 Query finale da processare:', queryToProcess);
      
      // Processa la query se c'è (anche se breve)
      if (queryToProcess.length > 0) {
        console.log('🎤 Processando query:', queryToProcess);
        handleVoiceQuery(queryToProcess);
        setPendingQuery('');
        setTranscript('');
      } else {
        console.log('🎤 Nessuna query da processare');
        // Mostra un messaggio all'utente
        toast.error('Non ho sentito nulla. Riprova a parlare più chiaramente.');
      }
    }, 100); // Piccolo delay per permettere al riconoscimento di terminare
  };

  return (
    <ProtectedRoute>
      <style>{scrollbarStyles}</style>
      <div className="h-screen flex bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 chat-container">
        {/* Sidebar - RESPONSIVE */}
        <div className={`${isSidebarOpen ? 'flex' : 'hidden'} md:flex flex-col w-64 md:w-80 lg:w-96 h-full transition-all duration-300`}>
          <div className="flex flex-col h-full w-full bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 border-r border-gray-700/50">
            {/* Header */}
            <div className="flex-shrink-0 p-4 md:p-6 border-b border-gray-700/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    DOCKY
                  </h1>
                </div>
                {/* Close sidebar button for mobile */}
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="md:hidden p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700/50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <Button 
                onClick={() => router.push('/')}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 border-0 text-white font-medium py-2 md:py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-sm md:text-base"
              >
                <ArrowLeft className="mr-2 w-3 h-3 md:w-4 md:h-4" />
                Torna alla Home
              </Button>
            </div>

            {/* Avatar DOCKY */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-6">
              <DockyAvatar />
              <div className="text-center mt-4">
                <h2 className="text-lg md:text-xl font-bold text-white mb-1">Assistente Vocale</h2>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - RESPONSIVE */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header - RESPONSIVE */}
          <header className="bg-black/30 backdrop-blur-xl border-b border-white/10 sticky top-0 z-40">
            <div className="w-full px-3 md:px-4 lg:px-8">
              <div className="flex items-center justify-between h-12 md:h-16">
                <div className="flex items-center space-x-2 md:space-x-4">
                  {/* Mobile menu button */}
                  <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="md:hidden p-2 text-white hover:bg-white/10 rounded-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  
                  <div className="flex items-center space-x-2 md:space-x-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg">
                      <Sparkles className="w-4 h-4 md:w-6 md:h-6 text-white" />
                    </div>
                    <div className="hidden sm:block">
                      <h1 className="text-lg md:text-xl font-bold text-white">DOCKY</h1>
                      <p className="text-xs text-purple-200">Assistente Vocale Intelligente</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 md:space-x-3">
                  {/* Indicatori di stato compatti - RESPONSIVE */}
                  {isButtonPressed && (
                    <div className="flex items-center space-x-1 md:space-x-2 bg-red-500/20 rounded-full px-2 md:px-3 py-1">
                      <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-red-400 rounded-full animate-ping" />
                      <span className="text-xs text-red-200">Parlando...</span>
                    </div>
                  )}
                  
                  {isProcessing && (
                    <div className="flex items-center space-x-1 md:space-x-2 bg-blue-500/20 rounded-full px-2 md:px-3 py-1">
                      <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-blue-400 rounded-full animate-pulse" />
                      <span className="text-xs text-blue-200">Elaborando...</span>
                    </div>
                  )}
                  
                  {isSpeaking && (
                    <div className="flex items-center space-x-1 md:space-x-2 bg-green-500/20 rounded-full px-2 md:px-3 py-1">
                      <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-green-400 rounded-full animate-ping" />
                      <span className="text-xs text-green-200">DOCKY parla...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Main Content Area - RESPONSIVE */}
          <main className="flex-1 flex w-full px-2 md:px-4 lg:px-8 py-2 md:py-4">
            <div className="flex gap-4 md:gap-6 lg:gap-8 w-full h-full">
              {/* Chat Area - RESPONSIVE */}
              <div className="flex-1 flex flex-col h-full max-h-full min-w-0">
                {/* Welcome Section - RESPONSIVE */}
                {messages.length === 0 && (
                  <div className="text-center py-6 md:py-12 px-2 md:px-4">
                    <div className="w-16 h-16 md:w-24 md:h-24 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-2xl">
                      <Sparkles className="w-8 h-8 md:w-12 md:h-12 text-white" />
                    </div>
                    <h2 className="text-2xl md:text-4xl font-bold text-white mb-3 md:mb-4 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                      Benvenuto in DOCKY! 🤖
                    </h2>
                    <p className="text-purple-200 text-sm md:text-lg mb-6 md:mb-8 max-w-2xl mx-auto">
                      Il tuo assistente vocale intelligente che cerca in tutti i tuoi documenti PDF. 
                      <strong className="text-white">Tieni premuto il pulsante microfono</strong> per parlare, poi rilascia per elaborare la domanda.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
                      <div className="bg-white/5 backdrop-blur-xl rounded-xl md:rounded-2xl p-4 md:p-6 border border-white/10 shadow-xl hover:bg-white/10 transition-all duration-300">
                        <Brain className="w-6 h-6 md:w-8 md:h-8 text-indigo-400 mx-auto mb-2 md:mb-3" />
                        <h3 className="text-white font-semibold mb-1 md:mb-2 text-sm md:text-base">Ricerca Intelligente</h3>
                        <p className="text-purple-200 text-xs md:text-sm">
                          Cerca in tutti i tuoi PDF caricati simultaneamente
                        </p>
                      </div>
                      <div className="bg-white/5 backdrop-blur-xl rounded-xl md:rounded-2xl p-4 md:p-6 border border-white/10 shadow-xl hover:bg-white/10 transition-all duration-300">
                        <MessageCircle className="w-6 h-6 md:w-8 md:h-8 text-purple-400 mx-auto mb-2 md:mb-3" />
                        <h3 className="text-white font-semibold mb-1 md:mb-2 text-sm md:text-base">Chat Vocale</h3>
                        <p className="text-purple-200 text-xs md:text-sm">
                          Interagisci naturalmente con la tua voce
                        </p>
                      </div>
                      <div className="bg-white/5 backdrop-blur-xl rounded-xl md:rounded-2xl p-4 md:p-6 border border-white/10 shadow-xl hover:bg-white/10 transition-all duration-300">
                        <Zap className="w-6 h-6 md:w-8 md:h-8 text-pink-400 mx-auto mb-2 md:mb-3" />
                        <h3 className="text-white font-semibold mb-1 md:mb-2 text-sm md:text-base">Risposte Immediate</h3>
                        <p className="text-purple-200 text-xs md:text-sm">
                          Ricevi risposte vocali in tempo reale
                        </p>
                      </div>
                    </div>

                    {!isMicrophoneEnabled && (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl md:rounded-2xl p-3 md:p-4 max-w-md mx-auto backdrop-blur-xl">
                        <p className="text-yellow-200 text-xs md:text-sm">
                          🔒 Per usare DOCKY, devi prima abilitare il microfono. 
                          Clicca il pulsante microfono nell'header.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Chat Messages - RESPONSIVE */}
                {messages.length > 0 && (
                  <div className="flex-1 flex flex-col min-h-0 h-full">
                    {/* Area messaggi con scroll - RESPONSIVE */}
                    <div className="flex-1 overflow-y-scroll custom-scrollbar min-h-0 messages-area" style={{ height: 'calc(100vh - 200px)' }}>
                      <div className="space-y-4 md:space-y-6 py-2 md:py-4 px-1 md:px-2">
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-xs sm:max-w-sm md:max-w-2xl lg:max-w-3xl rounded-xl md:rounded-2xl px-3 md:px-6 py-3 md:py-4 shadow-xl backdrop-blur-xl ${
                                message.type === 'user'
                                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                                  : 'bg-white/10 text-white border border-white/20'
                              }`}
                            >
                              <div className="flex items-start space-x-2 md:space-x-3">
                                {message.type === 'assistant' && (
                                  <div className="w-6 h-6 md:w-8 md:h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                                    <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-white" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs md:text-sm mb-1 opacity-70">
                                    {message.type === 'user' ? 'Tu' : 'DOCKY'}
                                    {message.isVoice && (
                                      <span className="ml-1 md:ml-2 text-xs bg-white/20 px-1 md:px-2 py-0.5 md:py-1 rounded-full">
                                        🎤 Vocale
                                      </span>
                                    )}
                                  </p>
                                  <p className="leading-relaxed text-sm md:text-base">{message.content}</p>
                                  <p className="text-xs opacity-50 mt-1 md:mt-2">
                                    {message.timestamp.toLocaleTimeString('it-IT', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    </div>

                    {/* Indicatori fissi in basso - RESPONSIVE */}
                    <div className="flex-shrink-0 mt-2 md:mt-4">
                      {/* Indicatore Microfono Attivo (solo quando necessario) */}
                      {isButtonPressed && !transcript && (
                        <div className="bg-gradient-to-r from-red-500/20 to-pink-500/20 backdrop-blur-xl rounded-xl md:rounded-2xl p-3 md:p-4 mb-3 md:mb-4 border border-red-500/30">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 md:w-3 md:h-3 bg-red-400 rounded-full animate-ping" />
                            <p className="text-red-200 text-xs md:text-sm font-medium">🎤 Microfono attivo - parla ora!</p>
                          </div>
                        </div>
                      )}

                      {/* Processing Indicator */}
                      {isProcessing && (
                        <div className="text-center py-3 md:py-4">
                          <div className="inline-flex items-center space-x-2 md:space-x-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-xl rounded-full px-4 md:px-6 py-2 md:py-3 border border-blue-500/30">
                            <div className="w-3 h-3 md:w-4 md:h-4 bg-blue-400 rounded-full animate-pulse" />
                            <span className="text-white text-xs md:text-sm">DOCKY sta elaborando la tua domanda...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Pulsante Grande a Destra - RESPONSIVE */}
              <div className="hidden lg:flex flex-col items-center justify-center w-60 xl:w-80 sticky top-8 h-fit">
                <div className="text-center mb-6 md:mb-8">
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-1 md:mb-2 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">🎤 Parla con DOCKY</h3>
                  <p className="text-purple-200 text-xs md:text-sm">Tieni premuto per parlare</p>
                </div>
                
                {/* Pulsante Microfono Gigante - RESPONSIVE */}
                <Button
                  onMouseDown={handleButtonPress}
                  onMouseUp={handleButtonRelease}
                  onTouchStart={handleButtonPress}
                  onTouchEnd={handleButtonRelease}
                  disabled={isProcessing}
                  className={`w-28 h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                    isButtonPressed 
                      ? 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 animate-pulse shadow-red-500/50' 
                      : isMicrophoneEnabled
                        ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 shadow-purple-500/50'
                        : 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 shadow-gray-500/50'
                  }`}
                >
                  {isButtonPressed ? (
                    <MicOff className="w-16 h-16 md:w-18 md:h-18 lg:w-20 lg:h-20 text-white" />
                  ) : (
                    <Mic className="w-16 h-16 md:w-18 md:h-18 lg:w-20 lg:h-20 text-white" />
                  )}
                </Button>
                
                {/* Pulsanti di Controllo - RESPONSIVE */}
                <div className="flex items-center space-x-3 md:space-x-4 mt-6 md:mt-8">
                  {/* Pulsante Ferma Audio */}
                  {isSpeaking && (
                    <Button
                      onClick={stopSpeaking}
                      className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-r from-orange-500/20 to-red-500/20 hover:from-orange-500/30 hover:to-red-500/30 text-orange-200 border-2 border-orange-500/30 hover:border-orange-500/50 transition-all duration-300 shadow-xl backdrop-blur-xl"
                    >
                      <VolumeX className="w-6 h-6 md:w-7 md:h-7" />
                    </Button>
                  )}
                  
                  {/* Pulsante Pulisci Chat */}
                  {messages.length > 0 && (
                    <Button
                      onClick={clearChat}
                      className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-r from-red-500/20 to-pink-500/20 hover:from-red-500/30 hover:to-pink-500/30 text-red-200 border-2 border-red-500/30 hover:border-red-500/50 transition-all duration-300 shadow-xl backdrop-blur-xl"
                    >
                      <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  )}
                </div>
                
                {/* Indicatori di stato - RESPONSIVE */}
                <div className="mt-6 md:mt-8 space-y-2 md:space-y-3">
                  {isButtonPressed && (
                    <div className="flex items-center justify-center space-x-2 bg-gradient-to-r from-red-500/20 to-pink-500/20 rounded-xl md:rounded-2xl px-3 md:px-4 py-2 md:py-3 border border-red-500/30 backdrop-blur-xl">
                      <div className="w-2 h-2 md:w-3 md:h-3 bg-red-400 rounded-full animate-ping" />
                      <span className="text-xs md:text-sm text-red-200 font-medium">Tieni premuto per parlare...</span>
                    </div>
                  )}
                  
                  {isProcessing && (
                    <div className="flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl md:rounded-2xl px-3 md:px-4 py-2 md:py-3 border border-blue-500/30 backdrop-blur-xl">
                      <div className="w-2 h-2 md:w-3 md:h-3 bg-blue-400 rounded-full animate-pulse" />
                      <span className="text-xs md:text-sm text-blue-200 font-medium">Elaborando...</span>
                    </div>
                  )}
                  
                  {isSpeaking && (
                    <div className="flex items-center justify-center space-x-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl md:rounded-2xl px-3 md:px-4 py-2 md:py-3 border border-green-500/30 backdrop-blur-xl">
                      <div className="w-2 h-2 md:w-3 md:h-3 bg-green-400 rounded-full animate-ping" />
                      <span className="text-xs md:text-sm text-green-200 font-medium">DOCKY sta parlando...</span>
                    </div>
                  )}
                  
                  {!isMicrophoneEnabled && (
                    <div className="flex items-center justify-center space-x-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl md:rounded-2xl px-3 md:px-4 py-2 md:py-3 border border-yellow-500/30 backdrop-blur-xl">
                      <div className="w-2 h-2 md:w-3 md:h-3 bg-yellow-400 rounded-full" />
                      <span className="text-xs md:text-sm text-yellow-200 font-medium">Microfono non abilitato</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>

        {/* Pulsante Mobile per schermi piccoli - RESPONSIVE */}
        <div className="lg:hidden fixed bottom-4 md:bottom-6 right-4 md:right-6 z-50">
          <Button
            onMouseDown={handleButtonPress}
            onMouseUp={handleButtonRelease}
            onTouchStart={handleButtonPress}
            onTouchEnd={handleButtonRelease}
            disabled={isProcessing}
            className={`w-16 h-16 md:w-20 md:h-20 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 ${
              isButtonPressed 
                ? 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 animate-pulse shadow-red-500/50' 
                : isMicrophoneEnabled
                  ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 shadow-purple-500/50'
                  : 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 shadow-gray-500/50'
            }`}
          >
            {isButtonPressed ? (
              <MicOff className="w-6 h-6 md:w-8 md:h-8 text-white" />
            ) : (
              <Mic className="w-6 h-6 md:w-8 md:h-8 text-white" />
            )}
          </Button>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default DockyPage; 