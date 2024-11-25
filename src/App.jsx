import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, MapPin, Clock, Umbrella, Coffee } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  
  // New states for enhanced features
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
    stage: 'initial' // Tracks conversation flow
  });

  // Initialize speech recognition
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

  // Enhanced conversation handling
  const conversationalResponse = (type, details) => {
    const responses = {
      initial_planning: `I'll help you get to ${details.destination}. Would you like to arrive by a specific time?`,
      weather_check: `I notice it's ${mockWeather.condition}. Would you prefer a route with good visibility and well-lit roads?`,
      break_suggestion: `This will be a ${details.duration} minute trip. Would you like me to plan any breaks along the way?`,
      route_confirmation: `I've found a route that matches your preferences. It will take about ${details.duration} minutes${
        drivingPreferences.avoidHighways ? ' avoiding highways' : ''
      }. Would you like to hear about potential stops?`,
      final_confirmation: `Great! I'll start navigation now. I'll notify you about breaks and conditions along the way.`
    };
    return responses[type] || details;
  };

  // Process voice commands
  const processCommand = (command) => {
    const lowerCommand = command.toLowerCase();
    
    // Navigation command handling
    if (lowerCommand.includes('navigate to') || lowerCommand.includes('take me to')) {
      const destination = lowerCommand.replace(/(navigate to|take me to)/i, '').trim();
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

    // Handle time-related responses
    if (conversationContext.isPlanning && conversationContext.stage === 'initial') {
      if (lowerCommand.includes('yes') && lowerCommand.includes('by')) {
        const timeMatch = lowerCommand.match(/\d{1,2}(?::\d{2})?\s*(?:am|pm)?/i);
        if (timeMatch) {
          setDrivingPreferences(prev => ({
            ...prev,
            arrivalTime: timeMatch[0]
          }));
        }
      }
      setConversationContext(prev => ({ ...prev, stage: 'weather' }));
      speak(conversationalResponse('weather_check', {}));
      return;
    }

    // Handle weather preferences
    if (conversationContext.stage === 'weather') {
      const wantsWellLit = lowerCommand.includes('yes') || lowerCommand.includes('prefer');
      setDrivingPreferences(prev => ({
        ...prev,
        preferWellLit: wantsWellLit
      }));
      
      // Simulate trip duration calculation
      const duration = Math.floor(Math.random() * 60) + 30;
      setConversationContext(prev => ({
        ...prev,
        currentTripDuration: duration,
        stage: 'breaks'
      }));
      speak(conversationalResponse('break_suggestion', { duration }));
      return;
    }

    // Handle break preferences
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

    // Handle final confirmation
    if (conversationContext.stage === 'confirmation' && 
       (lowerCommand.includes('yes') || lowerCommand.includes('start'))) {
      speak(conversationalResponse('final_confirmation', {}));
      setConversationContext(prev => ({
        ...prev,
        stage: 'navigating'
      }));
      return;
    }
  };

  // Speech synthesis
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

  // Toggle listening
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
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-6 w-6" />
            Smart Navigation Assistant
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Trip Planning Context */}
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

          {/* Error Messages */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Voice Controls */}
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

            {/* User Input Display */}
            {transcript && (
              <div className="w-full p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-700 mb-2">You said:</h3>
                <p className="text-gray-600">{transcript}</p>
              </div>
            )}

            {/* Assistant Response */}
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

          {/* Command Examples */}
          <div className="mt-8">
            <h3 className="font-medium text-gray-700 mb-2">Available Commands:</h3>
            <div className="space-y-4">
              {/* Navigation Commands */}
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-2">Navigation:</h4>
                <ul className="space-y-1 text-sm text-gray-600 pl-4">
                  <li>"Navigate to [destination]"</li>
                  <li>"Take me to [place name]"</li>
                  <li>"Drive to [location]"</li>
                </ul>
              </div>

              {/* Time Preferences */}
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-2">Time Preferences:</h4>
                <ul className="space-y-1 text-sm text-gray-600 pl-4">
                  <li>"Yes, arrive by [time]" (e.g., "3 PM", "15:30")</li>
                  <li>"No specific time"</li>
                  <li>"Need to be there by [time]"</li>
                </ul>
              </div>

              {/* Route Preferences */}
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-2">Route Preferences:</h4>
                <ul className="space-y-1 text-sm text-gray-600 pl-4">
                  <li>"Yes, prefer well-lit roads"</li>
                  <li>"Avoid highways"</li>
                  <li>"Take the fastest route"</li>
                </ul>
              </div>

              {/* Break Planning */}
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-2">Break Planning:</h4>
                <ul className="space-y-1 text-sm text-gray-600 pl-4">
                  <li>"Yes, plan some breaks"</li>
                  <li>"Include rest stops"</li>
                  <li>"No breaks needed"</li>
                </ul>
              </div>

              {/* During Navigation */}
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
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedVoiceAssistant;