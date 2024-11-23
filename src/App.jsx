import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

// Mock data
const mockPlaces = {
  attractions: [
    { name: "Central Park", type: "park", rating: 4.8, busyTimes: { morning: 60, afternoon: 90, evening: 70 }, timeNeeded: 120, location: [40.7829, -73.9654] },
    { name: "Art Museum", type: "museum", rating: 4.6, busyTimes: { morning: 40, afternoon: 80, evening: 30 }, timeNeeded: 90, location: [40.7794, -73.9632] },
    { name: "Local Market", type: "shopping", rating: 4.3, busyTimes: { morning: 70, afternoon: 85, evening: 40 }, timeNeeded: 60, location: [40.7831, -73.9712] },
    { name: "Botanical Garden", type: "nature", rating: 4.7, busyTimes: { morning: 50, afternoon: 75, evening: 45 }, timeNeeded: 120, location: [40.7815, -73.9733] }
  ],
  restaurants: [
    { name: "Green Leaf", type: "restaurant", cuisine: "vegetarian", priceLevel: 2, rating: 4.5, busyTimes: { morning: 30, afternoon: 80, evening: 90 }, avgMealTime: 45, location: [40.7834, -73.9723] },
    { name: "Spice Route", type: "restaurant", cuisine: "indian", priceLevel: 3, rating: 4.7, busyTimes: { morning: 20, afternoon: 70, evening: 95 }, avgMealTime: 60, location: [40.7821, -73.9701] },
    { name: "Pizza Corner", type: "restaurant", cuisine: "italian", priceLevel: 2, rating: 4.4, busyTimes: { morning: 40, afternoon: 75, evening: 85 }, avgMealTime: 30, location: [40.7847, -73.9689] },
    { name: "Sushi Express", type: "restaurant", cuisine: "japanese", priceLevel: 3, rating: 4.6, busyTimes: { morning: 30, afternoon: 65, evening: 90 }, avgMealTime: 45, location: [40.7856, -73.9667] }
  ]
};

const userPreferences = {
  cuisine: ["vegetarian", "indian"],
  priceRange: 2,
  maxDistance: 2000,
  location: [40.7831, -73.9712]
};

const VoiceAssistant = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");
  const [recognition, setRecognition] = useState(null);

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
        console.log("Recognized command:", command);
        setTranscript(command);
        processCommand(command);
      };

      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setError("Microphone access was denied. Please allow microphone access and try again.");
        } else {
          setError(`Error: ${event.error}`);
        }
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

  const speak = (text) => {
    try {
      console.log("Speaking text:", text);
      setResponse(text);

      if (!window.speechSynthesis) {
        setError("Speech synthesis not supported in this browser");
        return;
      }

      // Cancel any ongoing speech
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
        // Request microphone permission
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

  const processCommand = (command) => {
    try {
      console.log("Processing command:", command);

      if (!command) {
        console.error("Empty command received");
        return;
      }

      if (command.includes("plan my") && (command.includes("weekend") || command.includes("sunday") || command.includes("saturday"))) {
        console.log("Executing: Plan day");
        planDay();
      }
      else if (command.includes("find") && (command.includes("lunch") || command.includes("dinner") || command.includes("place") || command.includes("eat"))) {
        console.log("Executing: Find restaurant");
        findRestaurant();
      }
      else if (command.includes("hours") && command.includes("explore")) {
        console.log("Executing: Exploration plan");
        const hours = parseInt(command.match(/\d+/)?.[0] || 3);
        planTimeBasedExploration(hours);
      }
      else {
        console.log("Command not recognized");
        speak("I'm sorry, I didn't understand that command. You can ask me to plan your day, find a place to eat, or help you explore for a specific number of hours.");
      }
    } catch (err) {
      console.error("Error processing command:", err);
      setError("Failed to process command");
    }
  };

  const findRestaurant = () => {
    try {
      console.log("Finding restaurant...");
      const currentHour = new Date().getHours();
      const period = currentHour < 12 ? 'morning' : currentHour < 17 ? 'afternoon' : 'evening';
      
      const filteredRestaurants = mockPlaces.restaurants.filter(restaurant => 
        userPreferences.cuisine.includes(restaurant.cuisine) &&
        restaurant.priceLevel <= userPreferences.priceRange
      );

      if (filteredRestaurants.length === 0) {
        speak("I couldn't find any restaurants matching your preferences at this time.");
        return;
      }

      const sortedRestaurants = filteredRestaurants.sort((a, b) => {
        return (b.rating - a.rating) || (a.busyTimes[period] - b.busyTimes[period]);
      });

      const topPicks = sortedRestaurants.slice(0, 3);
      const response = `I recommend these restaurants: 1. ${topPicks[0].name} with ${topPicks[0].cuisine} cuisine${topPicks[1] ? `, 2. ${topPicks[1].name}` : ''}${topPicks[2] ? `, and 3. ${topPicks[2].name}` : ''}. These are selected based on your preferences and current availability.`;
      
      console.log("Restaurant response:", response);
      speak(response);
    } catch (err) {
      console.error("Error in findRestaurant:", err);
      setError("Failed to find restaurants");
    }
  };

  const planDay = () => {
    try {
      console.log("Planning day...");
      const currentHour = new Date().getHours();
      const period = currentHour < 12 ? 'morning' : currentHour < 17 ? 'afternoon' : 'evening';
      
      const sortedAttractions = mockPlaces.attractions.sort((a, b) => {
        return (b.rating - a.rating) || (a.busyTimes[period] - b.busyTimes[period]);
      });

      const schedule = sortedAttractions.slice(0, 3);
      const response = `Here's your plan: Start with ${schedule[0].name} which is perfect for this time. Then head to ${schedule[1].name}, and finish your day at ${schedule[2].name}. Each place has been chosen based on current crowds and ratings.`;
      
      console.log("Day plan response:", response);
      speak(response);
    } catch (err) {
      console.error("Error in planDay:", err);
      setError("Failed to plan day");
    }
  };

  const planTimeBasedExploration = (hours) => {
    try {
      console.log("Planning time-based exploration for", hours, "hours");
      const totalMinutes = hours * 60;
      let remainingTime = totalMinutes;
      const schedule = [];
      
      const sortedPlaces = mockPlaces.attractions.sort((a, b) => b.rating - a.rating);
      
      for (const place of sortedPlaces) {
        if (remainingTime >= place.timeNeeded + 30) {
          schedule.push(place);
          remainingTime -= (place.timeNeeded + 30);
        }
        if (remainingTime < 60) break;
      }

      if (schedule.length === 0) {
        speak(`I couldn't plan a suitable itinerary for ${hours} hours.`);
        return;
      }

      const response = `For your ${hours}-hour exploration, I suggest: Start at ${schedule[0].name} (${schedule[0].timeNeeded} minutes)${schedule[1] ? `, then visit ${schedule[1].name} (${schedule[1].timeNeeded} minutes)` : ''}${schedule[2] ? `, and if time permits, check out ${schedule[2].name}` : ''}. This plan includes travel time between locations.`;
      
      console.log("Exploration plan response:", response);
      speak(response);
    } catch (err) {
      console.error("Error in planTimeBasedExploration:", err);
      setError("Failed to plan exploration");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Google Maps Voice Assistant</h1>
        
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Available Commands:</h2>
          <ul className="list-disc pl-5 text-gray-600">
            <li>"Plan my weekend/Sunday"</li>
            <li>"Find a place for lunch"</li>
            <li>"I have [X] hours to explore"</li>
          </ul>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <div className="flex flex-col items-center space-y-4">
          <button
            onClick={toggleListening}
            className={`p-4 rounded-full ${isListening ? 'bg-red-500' : 'bg-blue-500'} text-white shadow-lg hover:opacity-90 transition-opacity`}
            disabled={!recognition}
          >
            {isListening ? <MicOff size={24} /> : <Mic size={24} />}
          </button>
          
          <div className="text-sm text-gray-500">
            {isListening ? 'Listening...' : 'Click to speak'}
          </div>

          {transcript && (
            <div className="w-full p-4 bg-gray-50 rounded-lg mt-4">
              <h3 className="font-medium text-gray-700">You said:</h3>
              <p className="text-gray-600">{transcript}</p>
            </div>
          )}

          {response && (
            <div className="w-full p-4 bg-blue-50 rounded-lg mt-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-medium text-gray-700">Assistant's response:</h3>
                {isSpeaking ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </div>
              <p className="text-gray-600">{response}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceAssistant;