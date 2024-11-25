import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, MapPin, Clock, Umbrella, Coffee } from 'lucide-react';

// Mock data for places and weather
const mockPlaces = {
  attractions: [
    { name: "Central Park", type: "park", rating: 4.8, busyTimes: { morning: 60, afternoon: 90, evening: 70 }, timeNeeded: 120, location: [40.7829, -73.9654] },
    { name: "Art Museum", type: "museum", rating: 4.6, busyTimes: { morning: 40, afternoon: 80, evening: 30 }, timeNeeded: 90, location: [40.7794, -73.9632] }
  ],
  restaurants: [
    { name: "Green Leaf", type: "restaurant", cuisine: "vegetarian", priceLevel: 2, rating: 4.5, busyTimes: { morning: 30, afternoon: 80, evening: 90 }, avgMealTime: 45, location: [40.7834, -73.9723] },
    { name: "Spice Route", type: "restaurant", cuisine: "indian", priceLevel: 3, rating: 4.7, busyTimes: { morning: 20, afternoon: 70, evening: 95 }, avgMealTime: 60, location: [40.7821, -73.9701] }
  ]
};

const mockWeather = {
  condition: 'rainy',
  temperature: 18,
  visibility: 'moderate',
  isNight: false
};

const EnhancedVoiceAssistant = () => {
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
        setIsListening(true);
        setError("");
      };
      
      recognitionInstance.onresult = (event) => {
        const last = event.results.length - 1;
        const command = event.results[last][0].transcript.toLowerCase();
        setTranscript(command);
        processCommand(command);
      };

      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setError(event.error === 'not-allowed' 
          ? "Microphone access was denied. Please allow microphone access and try again."
          : `Error: ${event.error}`);
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    } catch (err) {
      console.error('Error initializing speech recognition:', err);
      setError("Failed to initialize speech recognition. Please use Chrome or Edge.");
    }
  }, []);

  const conversationalResponse = (type, details) => {
    const responses = {
      initial_planning: `I'll help you get to ${details.destination}. Would you like to arrive by a specific time? You can say 'no specific time' or specify a time like '3 PM'.`,
      weather_check: `Great. I notice it's ${mockWeather.condition}. Would you prefer a route with good visibility and well-lit roads?`,
      break_suggestion: `This will be a ${details.duration} minute trip. Would you like me to plan any breaks along the way?`,
      route_confirmation: `I've found a route that matches your preferences. It will take about ${details.duration} minutes${
        drivingPreferences.avoidHighways ? ' avoiding highways' : ''
      }. Would you like to hear about potential stops?`,
      final_confirmation: `Great! I'll start navigation now. I'll notify you about breaks and conditions along the way.`
    };
    return responses[type] || details;
  };

  // Intent recognition patterns
  const intents = {
    navigation: {
      patterns: [
        /(?:navigate|take me|drive|go) to (.*)/i,
        /directions? to (.*)/i,
        /how (?:do i|to) get to (.*)/i,
      ]
    },
    timePreference: {
      patterns: [
        /(?:arrive|be there) by (\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?)/i,
        /(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?))/i,
        /(\d{1,2})[:\s](\d{2})/i,
        /^(\d{1,2})(?:\s*(?:a\.?m\.?|p\.?m\.?))?$/i
      ],
      negativePatterns: [
        /no(?: specific)? time/i,
        /doesn'?t matter/i,
        /any ?time/i,
        /^no$/i
      ]
    },
    // ... rest of the intents remain the same ...
  };

  const processCommand = (command) => {
    const lowerCommand = command.toLowerCase();
    console.log('Processing command:', lowerCommand);
    console.log('Current context:', conversationContext);

    // If we're already in a planning session and at the time preference stage
    if (conversationContext.isPlanning && conversationContext.stage === 'initial') {
      // First, check for time patterns
      for (const pattern of intents.timePreference.patterns) {
        const match = command.match(pattern);
        if (match) {
          const time = match[1];
          console.log('Time matched:', time);
          setDrivingPreferences(prev => ({
            ...prev,
            arrivalTime: time
          }));
          setConversationContext(prev => ({ 
            ...prev,
            stage: 'weather',
            hasAskedPreferences: true 
          }));
          speak(conversationalResponse('weather_check', {}));
          return;
        }
      }
      
      // Check for negative time responses
      for (const pattern of intents.timePreference.negativePatterns) {
        if (pattern.test(lowerCommand)) {
          setConversationContext(prev => ({ 
            ...prev, 
            stage: 'weather',
            hasAskedPreferences: true 
          }));
          speak(conversationalResponse('weather_check', {}));
          return;
        }
      }
    }

    // If not a time response and we're not planning yet, check for navigation intent
    if (!conversationContext.isPlanning) {
      for (const pattern of intents.navigation.patterns) {
        const match = lowerCommand.match(pattern);
        if (match) {
          const destination = match[1].trim();
          setConversationContext({
            isPlanning: true,
            destination,
            stage: 'initial',
            hasAskedPreferences: false
          });
          speak(conversationalResponse('initial_planning', { destination }));
          return;
        }
      }
    }

    // Weather/Route preference processing
    if (conversationContext.stage === 'weather') {
      const wellLitMatch = lowerCommand.includes('yes') || lowerCommand.includes('prefer');
      setDrivingPreferences(prev => ({
        ...prev,
        preferWellLit: wellLitMatch
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

    // Break preference processing
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

    // Provide context-specific help if the command wasn't recognized
    if (conversationContext.isPlanning) {
      switch (conversationContext.stage) {
        case 'initial':
          speak("I heard you want to arrive by " + command + ". Just to confirm, is that your desired arrival time? Or you can say 'no specific time'.");
          break;
        case 'weather':
          speak("Would you like a route with good visibility and well-lit roads? Just say 'yes' or 'no'.");
          break;
        case 'breaks':
          speak("Should I plan rest stops along the way? You can say 'yes' or 'no'.");
          break;
        default:
          speak("I didn't catch that. Could you please try rephrasing?");
      }
    } else {
      speak("You can start by saying something like 'Navigate to Central Park' or 'Take me to the airport'.");
    }
  };
    routePreference: {
      wellLit: [
        /(?:yes|yeah|sure).*(?:well[- ]?lit|visibility)/i,
        /prefer (?:well[- ]?lit|better visibility)/i,
        /^yes$/i
      ],
      avoidHighways: [
        /(?:avoid|no|skip) highways?/i,
        /(?:local|side|smaller) roads?/i
      ]
    },
    breaks: {
      patterns: [
        /(?:yes|yeah|sure).*breaks?/i,
        /(?:plan|include|add) (?:some )?breaks?/i,
        /^yes$/i
      ],
      negativePatterns: [
        /no breaks?/i,
        /don'?t (?:need|want) breaks?/i,
        /^no$/i
      ]
    }
  };

  // Intent recognition function
  const recognizeIntent = (text, intentPatterns) => {
    for (const pattern of intentPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match;
      }
    }
    return null;
  };

  const processCommand = (command) => {
    const lowerCommand = command.toLowerCase();
    console.log('Processing command:', lowerCommand);
    console.log('Current context:', conversationContext);

    // Navigation intent
    if (!conversationContext.isPlanning) {
      for (const pattern of intents.navigation.patterns) {
        const match = lowerCommand.match(pattern);
        if (match) {
          const destination = match[1].trim();
          setConversationContext({
            isPlanning: true,
            destination,
            stage: 'initial'
          });
          speak(conversationalResponse('initial_planning', { destination }));
          return;
        }
      }
    }

    // Time preference intent
    if (conversationContext.isPlanning && conversationContext.stage === 'initial') {
      // Check for negative time preference first
      const noTimeMatch = recognizeIntent(lowerCommand, intents.timePreference.negativePatterns);
      if (noTimeMatch) {
        setConversationContext(prev => ({ ...prev, stage: 'weather' }));
        speak(conversationalResponse('weather_check', {}));
        return;
      }

      // Check for specific time
      for (const pattern of intents.timePreference.patterns) {
        const match = lowerCommand.match(pattern);
        if (match) {
          const time = match[1];
          setDrivingPreferences(prev => ({
            ...prev,
            arrivalTime: time
          }));
          setConversationContext(prev => ({ ...prev, stage: 'weather' }));
          speak(conversationalResponse('weather_check', {}));
          return;
        }
      }
    }

    // Weather/Route preference intent
    if (conversationContext.stage === 'weather') {
      const wellLitMatch = recognizeIntent(lowerCommand, intents.routePreference.wellLit);
      if (wellLitMatch || lowerCommand.includes('no')) {
        setDrivingPreferences(prev => ({
          ...prev,
          preferWellLit: !!wellLitMatch
        }));
        setConversationContext(prev => ({
          ...prev,
          stage: 'breaks',
          currentTripDuration: Math.floor(Math.random() * 60) + 30
        }));
        speak(conversationalResponse('break_suggestion', { 
          duration: conversationContext.currentTripDuration 
        }));
        return;
      }
    }

    // Break preference intent
    if (conversationContext.stage === 'breaks') {
      const wantsBreaks = recognizeIntent(lowerCommand, intents.breaks.patterns);
      const noBreaks = recognizeIntent(lowerCommand, intents.breaks.negativePatterns);
      
      if (wantsBreaks || noBreaks) {
        setDrivingPreferences(prev => ({
          ...prev,
          needsFrequentBreaks: !!wantsBreaks
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
    }

    // Confirmation intent
    if (conversationContext.stage === 'confirmation') {
      if (lowerCommand.includes('yes') || lowerCommand.includes('start') || lowerCommand.includes('okay')) {
        speak(conversationalResponse('final_confirmation', {}));
        setConversationContext(prev => ({
          ...prev,
          stage: 'navigating'
        }));
        return;
      }
    }

    // Context-specific help messages for unrecognized commands
    if (conversationContext.isPlanning) {
      switch (conversationContext.stage) {
        case 'initial':
          speak("I'm waiting for your time preference. You can say something like '3:30 PM' or 'no specific time'.");
          break;
        case 'weather':
          speak("Would you like a route with good visibility and well-lit roads? Just say 'yes' or 'no'.");
          break;
        case 'breaks':
          speak("Should I plan rest stops along the way? You can say 'yes' or 'no'.");
          break;
        case 'confirmation':
          speak("Should I start the navigation now? Say 'yes' to begin.");
          break;
        default:
          speak("I didn't catch that. Could you please try rephrasing?");
      }
    } else {
      speak("You can start by saying something like 'Navigate to Central Park' or 'Take me to the airport'.");
    }
  };

  const speak = (text) => {
    try {
      setResponse(text);

      if (!window.speechSynthesis) {
        setError("Speech synthesis not supported in this browser");
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (e) => {
        console.error("Speech synthesis error:", e);
        setError("Failed to speak response");
        setIsSpeaking(false);
      };

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
        setError("");
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
              isListening ? 'bg-red-500' : 'bg-blue-500'
            } text-white shadow-lg hover:opacity-90 transition-opacity`}
            disabled={!recognition}
          >
            {isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </button>

          <div className="text-sm text-gray-500">
            {isListening ? 'Listening...' : 'Click to speak'}
          </div>

          {transcript && (
            <div className="w-full p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-2">You said:</h3>
              <p className="text-gray-600">{transcript}</p>
            </div>
          )}

          {response && (
            <div className="w-full p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-medium text-gray-700">Assistant:</h3>
                {isSpeaking ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </div>
              <p className="text-gray-600">{response}</p>
            </div>
          )}
        </div>

        <div className="mt-8">
          <h3 className="font-medium text-gray-700 mb-2">Available Commands:</h3>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">Navigation:</h4>
              <ul className="space-y-1 text-sm text-gray-600 pl-4">
                <li>"Navigate to [destination]"</li>
                <li>"Take me to [place name]"</li>
                <li>"Drive to [location]"</li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">Time Preferences:</h4>
              <ul className="space-y-1 text-sm text-gray-600 pl-4">
                <li>"Yes, arrive by [time]" (e.g., "3 PM", "15:30")</li>
                <li>"No specific time"</li>
                <li>"Need to be there by [time]"</li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">Route Preferences:</h4>
              <ul className="space-y-1 text-sm text-gray-600 pl-4">
                <li>"Yes, prefer well-lit roads"</li>
                <li>"Avoid highways"</li>
                <li>"Take the fastest route"</li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">Break Planning:</h4>
              <ul className="space-y-1 text-sm text-gray-600 pl-4">
                <li>"Yes, plan some breaks"</li>
                <li>"Include rest stops"</li>
                <li>"No breaks needed"</li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">During Navigation:</h4>
              <ul className="space-y-1 text-sm text-gray-600 pl-4">
                <li>"Find a rest stop"</li>
                <li>"How much longer?"</li>
                <li>"Change route"</li>
                <li>"Avoid upcoming traffic"</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedVoiceAssistant;