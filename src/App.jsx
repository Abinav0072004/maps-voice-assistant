import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, MapPin, Clock, Umbrella, Coffee } from 'lucide-react';

const mockWeather = {
  condition: 'rainy',
  temperature: 18,
  visibility: 'moderate',
  isNight: false
};

const VoiceAssistant = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");
  const [recognition, setRecognition] = useState(null);
  
  const [drivingPreferences, setDrivingPreferences] = useState({
    avoidHighways: false,
    preferWellLit: false,
    needsFrequentBreaks: false,
    arrivalTime: null,
    weatherPreference: 'any'
  });

  const [conversationContext, setConversationContext] = useState({
    isPlanning: false,
    destination: null,
    hasAskedPreferences: false,
    currentTripDuration: null,
    stage: 'initial'
  });

  const conversationalResponse = (type, details) => {
    const responses = {
      initial_planning: `I'll help you get to ${details.destination}. What time would you like to arrive? You can say a specific time like '3:30 PM' or say 'no specific time'.`,
      weather_check: `Perfect. Since it's ${mockWeather.condition} today, would you like me to find a route with good visibility and well-lit roads?`,
      break_suggestion: `This journey will take about ${details.duration} minutes. Would you like me to plan any rest stops along the way?`,
      route_confirmation: `Great! I've found a route that will get you there in ${details.duration} minutes${
        drivingPreferences.avoidHighways ? ' avoiding highways' : ''
      }. Ready to start navigation?`,
      final_confirmation: `Starting navigation now. I'll keep you updated about weather conditions and breaks along the way.`
    };
    return responses[type] || details;
  };

  useEffect(() => {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
      setError("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onstart = () => {
        console.log('Started listening...');
        setIsListening(true);
        setError("");
      };
      
      recognitionInstance.onresult = (event) => {
        const last = event.results.length - 1;
        const command = event.results[last][0].transcript;
        console.log('Heard command:', command);
        setTranscript(command);
        processCommand(command);
        recognitionInstance.stop();
      };

      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setError("Microphone access was denied. Please allow microphone access and try again.");
        } else {
          setError(`Error: ${event.error}`);
        }
        recognitionInstance.stop();
      };

      recognitionInstance.onend = () => {
        console.log('Stopped listening.');
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    } catch (err) {
      console.error('Error initializing speech recognition:', err);
      setError("Failed to initialize speech recognition. Please use Chrome or Edge.");
    }
  }, []);

  const processCommand = (command) => {
    const lowerCommand = command.toLowerCase();
    console.log('Processing command:', lowerCommand);
    console.log('Current context:', conversationContext);

    // Navigation command handling
    if (!conversationContext.isPlanning && 
        (lowerCommand.includes('navigate to') || 
         lowerCommand.includes('take me to') || 
         lowerCommand.includes('drive to'))) {
      const destination = lowerCommand
        .replace(/(navigate to|take me to|drive to)/i, '')
        .trim();
      setConversationContext({
        isPlanning: true,
        destination,
        hasAskedPreferences: false,
        currentTripDuration: null,
        stage: 'initial'
      });
      speak(conversationalResponse('initial_planning', { destination }));
      return;
    }

    // Time preference handling
    if (conversationContext.isPlanning && conversationContext.stage === 'initial') {
      if (lowerCommand.includes('no specific time') || lowerCommand === 'no') {
        setConversationContext(prev => ({ ...prev, stage: 'weather' }));
        speak(conversationalResponse('weather_check', {}));
        return;
      }

      const timePattern = /(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i;
      const timeMatch = lowerCommand.match(timePattern);
      if (timeMatch) {
        setDrivingPreferences(prev => ({
          ...prev,
          arrivalTime: timeMatch[1]
        }));
        setConversationContext(prev => ({ ...prev, stage: 'weather' }));
        speak(conversationalResponse('weather_check', {}));
        return;
      }
    }

    // Weather/Route preference handling
    if (conversationContext.stage === 'weather') {
      const wantsWellLit = lowerCommand.includes('yes') || lowerCommand.includes('prefer');
      setDrivingPreferences(prev => ({
        ...prev,
        preferWellLit: wantsWellLit
      }));
      const duration = Math.floor(Math.random() * 60) + 30;
      setConversationContext(prev => ({
        ...prev,
        stage: 'breaks',
        currentTripDuration: duration
      }));
      speak(conversationalResponse('break_suggestion', { duration }));
      return;
    }

    // Break preference handling
    if (conversationContext.stage === 'breaks') {
      const wantsBreaks = lowerCommand.includes('yes') || lowerCommand.includes('please');
      setDrivingPreferences(prev => ({
        ...prev,
        needsFrequentBreaks: wantsBreaks
      }));
      setConversationContext(prev => ({
        ...prev,
        stage: 'confirmation'
      }));
      speak(conversationalResponse('route_confirmation', {
        duration: conversationContext.currentTripDuration
      }));
      return;
    }

    // Final confirmation
    if (conversationContext.stage === 'confirmation' && 
       (lowerCommand.includes('yes') || lowerCommand.includes('start'))) {
      speak(conversationalResponse('final_confirmation', {}));
      setConversationContext(prev => ({
        ...prev,
        stage: 'navigating'
      }));
      return;
    }

    // Handle unrecognized commands
    if (conversationContext.isPlanning) {
      switch (conversationContext.stage) {
        case 'initial':
          speak("Please let me know your time preference. You can say a specific time like '3 PM' or 'no specific time'.");
          break;
        case 'weather':
          speak("Would you like a route with good visibility and well-lit roads? Please say 'yes' or 'no'.");
          break;
        case 'breaks':
          speak("Would you like me to plan breaks along the route? Please say 'yes' or 'no'.");
          break;
        default:
          speak("I didn't understand that. What would you like to do?");
      }
    } else {
      speak("You can start by saying 'Navigate to [destination]' or 'Take me to [place]'.");
    }
  };

  const speak = (text) => {
    try {
      setResponse(text);
      if (!window.speechSynthesis) {
        setError("Speech synthesis not supported");
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("Error in speak function:", err);
      setError("Failed to generate voice response");
    }
  };

  const toggleListening = async () => {
    if (!recognition) {
      setError("Speech recognition not available");
      return;
    }

    try {
      if (isListening) {
        recognition.stop();
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        recognition.start();
      }
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError("Microphone access denied");
      setIsListening(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <MapPin className="h-6 w-6" />
          <h1 className="text-2xl font-bold text-gray-800">Smart Navigation Assistant</h1>
        </div>

        {conversationContext.isPlanning && (
          <div className="mb-6 space-y-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>Destination: {conversationContext.destination}</span>
            </div>
            {drivingPreferences.arrivalTime && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>Arrival Time: {drivingPreferences.arrivalTime}</span>
              </div>
            )}
            {mockWeather.condition && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Umbrella className="h-4 w-4" />
                <span>Weather: {mockWeather.condition}</span>
              </div>
            )}
            {drivingPreferences.needsFrequentBreaks && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Coffee className="h-4 w-4" />
                <span>Breaks planned along route</span>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-600">
            {error}
          </div>
        )}

        <div className="flex flex-col items-center space-y-6">
          <button
            onClick={toggleListening}
            className={`p-4 rounded-full ${
              isListening ? 'bg-red-500 animate-pulse' : 'bg-