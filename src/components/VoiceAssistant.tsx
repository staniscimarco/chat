"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Settings, Sparkles } from 'lucide-react';
import { Button } from './ui/button';

interface VoiceAssistantProps {
  isEnabled: boolean;
  onToggle: () => void;
}

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ isEnabled, onToggle }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [wakeWordDetected, setWakeWordDetected] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Inizializza il riconoscimento vocale
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'it-IT';
      
      recognitionRef.current.onstart = () => {
        console.log('🎤 Riconoscimento vocale attivato');
        setIsListening(true);
      };
      
      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        const fullTranscript = finalTranscript + interimTranscript;
        setTranscript(fullTranscript);
        
        // Controlla se è stato detto il wake word
        if (fullTranscript.toLowerCase().includes('ciao docky') || 
            fullTranscript.toLowerCase().includes('hey docky') ||
            fullTranscript.toLowerCase().includes('docky')) {
          setWakeWordDetected(true);
          console.log('🔔 Wake word rilevata!');
          
          // Rimuovi il wake word dal transcript
          const cleanTranscript = fullTranscript
            .toLowerCase()
            .replace(/ciao docky|hey docky|docky/gi, '')
            .trim();
          
          if (cleanTranscript) {
            handleVoiceQuery(cleanTranscript);
          }
        }
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('❌ Errore riconoscimento vocale:', event.error);
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        console.log('🎤 Riconoscimento vocale terminato');
        setIsListening(false);
        setWakeWordDetected(false);
      };
    }
    
    // Inizializza la sintesi vocale
    synthesisRef.current = window.speechSynthesis;
    
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
    setResponse('');
    
    try {
      console.log('🔍 Query vocale:', query);
      
      // Chiamata API per cercare in tutti i PDF
      const response = await fetch('/api/voice-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });
      
      if (!response.ok) {
        throw new Error('Errore nella ricerca vocale');
      }
      
      const data = await response.json();
      console.log('🎯 Risposta vocale:', data);
      
      setResponse(data.answer);
      
      // Leggi la risposta ad alta voce
      speakResponse(data.answer);
      
    } catch (error) {
      console.error('❌ Errore query vocale:', error);
      const errorMessage = 'Mi dispiace, ho avuto un problema nel processare la tua domanda. Puoi ripetere?';
      setResponse(errorMessage);
      speakResponse(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // Funzione per leggere la risposta ad alta voce
  const speakResponse = (text: string) => {
    if (!synthesisRef.current) return;
    
    // Cancella eventuali sintesi precedenti
    synthesisRef.current.cancel();
    
    utteranceRef.current = new SpeechSynthesisUtterance(text);
    utteranceRef.current.lang = 'it-IT';
    utteranceRef.current.rate = 0.9; // Velocità leggermente più lenta per suonare più naturale
    utteranceRef.current.pitch = 1.0;
    utteranceRef.current.volume = 1.0;
    
    // Prova a usare una voce più naturale
    const voices = synthesisRef.current.getVoices();
    const italianVoice = voices.find(voice => 
      voice.lang.includes('it') && voice.name.includes('Google')
    ) || voices.find(voice => voice.lang.includes('it'));
    
    if (italianVoice) {
      utteranceRef.current.voice = italianVoice;
    }
    
    utteranceRef.current.onstart = () => {
      setIsSpeaking(true);
      console.log('🔊 Iniziando sintesi vocale');
    };
    
    utteranceRef.current.onend = () => {
      setIsSpeaking(false);
      console.log('🔊 Sintesi vocale completata');
    };
    
    utteranceRef.current.onerror = (event) => {
      console.error('❌ Errore sintesi vocale:', event);
      setIsSpeaking(false);
    };
    
    synthesisRef.current.speak(utteranceRef.current);
  };

  // Avvia/ferma l'ascolto
  const toggleListening = () => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  // Ferma la sintesi vocale
  const stopSpeaking = () => {
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  if (!isEnabled) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Pulsante principale */}
      <div className="relative">
        <Button
          onClick={toggleListening}
          disabled={isProcessing}
          className={`w-16 h-16 rounded-full shadow-lg transition-all duration-300 ${
            isListening 
              ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
              : wakeWordDetected 
                ? 'bg-green-500 hover:bg-green-600 animate-bounce'
                : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {isListening ? (
            <MicOff className="w-6 h-6 text-white" />
          ) : (
            <Mic className="w-6 h-6 text-white" />
          )}
        </Button>
        
        {/* Indicatore di stato */}
        {isListening && (
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-ping" />
        )}
        
        {isSpeaking && (
          <div className="absolute -top-2 -left-2 w-4 h-4 bg-green-500 rounded-full animate-ping" />
        )}
      </div>

      {/* Pannello di controllo */}
      <div className="mt-4 bg-white rounded-lg shadow-xl p-4 w-80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-gray-900">DOCKY Assistant</h3>
          </div>
          <Button
            onClick={onToggle}
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-700"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>

        {/* Stato */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center space-x-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-red-500' : 'bg-gray-300'}`} />
            <span className="text-gray-600">
              {isListening ? 'In ascolto...' : 'In attesa'}
            </span>
          </div>
          
          {wakeWordDetected && (
            <div className="flex items-center space-x-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-green-600 font-medium">Wake word rilevata!</span>
            </div>
          )}
          
          {isProcessing && (
            <div className="flex items-center space-x-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-blue-600">Elaborazione...</span>
            </div>
          )}
        </div>

        {/* Transcript */}
        {transcript && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-1">Hai detto:</p>
            <p className="text-sm bg-gray-50 p-2 rounded border">{transcript}</p>
          </div>
        )}

        {/* Risposta */}
        {response && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-500">Risposta:</p>
              <div className="flex space-x-1">
                {isSpeaking && (
                  <Button
                    onClick={stopSpeaking}
                    variant="ghost"
                    size="sm"
                    className="p-1 h-6 w-6"
                  >
                    <VolumeX className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
            <p className="text-sm bg-blue-50 p-2 rounded border border-blue-200">
              {response}
            </p>
          </div>
        )}

        {/* Istruzioni */}
        <div className="text-xs text-gray-500">
          <p>💡 Dì "Ciao DOCKY" seguito dalla tua domanda</p>
          <p>🎯 Cercherò in tutti i tuoi documenti</p>
        </div>
      </div>
    </div>
  );
};

export default VoiceAssistant; 