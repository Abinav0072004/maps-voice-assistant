import React, { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import _ from 'lodash';

// Mock data for places, activities, and restaurants
const mockPlaces = {
  attractions: [
    { name: "Central Park", type: "park", rating: 4.8, busyTimes: { morning: 60, afternoon: 90, evening: 70 }, timeNeeded: 120, location: [40.7829, -73.9654] },
    { name: "Art Museum", type: "museum", rating: 4.6, busyTimes: { morning: 40, afternoon: 80, evening: 30 }, timeNeeded: 90, location: [40.7794, -73.9632] },
    { name: "Local Market", type: "shopping", rating: 4.3, busyTimes: { morning: 70, afternoon: 85, evening: 40 }, timeNeeded: 60, location: [40.7831, -73.9712] },
    { name: "Botanical Garden", type: "nature", rating: 4.7, busyTimes: { morning: 50, afternoon: 75, evening: 45 }, timeNeeded: 120, location: [40.7815, -73.9733] },
  ],
  restaurants: [
    { name: "Green Leaf", type: "restaurant", cuisine: "vegetarian", priceLevel: 2, rating: 4.5, busyTimes: { morning: 30, afternoon: 80, evening: 90 }, avgMealTime: 45, location: [40.7834, -73.9723] },
    { name: "Spice Route", type: "restaurant", cuisine: "indian", priceLevel: 3, rating: 4.7, busyTimes: { morning: 20, afternoon: 70, evening: 95 }, avgMealTime: 60, location: [40.7821, -73.9701] },
    { name: "Pizza Corner", type: "restaurant", cuisine: "italian", priceLevel: 2, rating: 4.4, busyTimes: { morning: 40, afternoon: 75, evening: 85 }, avgMealTime: 30, location: [40.7847, -73.9689] },
    { name: "Sushi Express", type: "restaurant", cuisine: "japanese", priceLevel: 3, rating: 4.6, busyTimes: { morning: 30, afternoon: 65, evening: 90 }, avgMealTime: 45, location: [40.7856, -73.9667] },
  ]
};

// Mock user preferences
const userPreferences = {
  cuisine: ["vegetarian", "indian"],
  priceRange: 2,
  maxDistance: 2000, // meters
  location: [40.7831, -73.9712], // Current location
};

const VoiceAssistant = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    // Initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      
      recognition.onresult = (event) => {
        const last = event.results.length - 1;
        const command = event.results[last][0].transcript.toLowerCase();
        setTranscript(command);
        processCommand(command);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognition);
    }
  }, []);

  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setResponse(text);
  };

  const toggleListening = () => {
    if (isListening) {
      recognition?.stop();
    } else {
      recognition?.start();
      setIsListening(true);
    }
  };

  const processCommand = (command) => {
    // Plan weekend/day
    if (command.includes("plan my") && (command.includes("weekend") || command.includes("sunday") || command.includes("saturday"))) {
      planDay();
    }
    // Find lunch/dinner place
    else if (command.includes("find") && (command.includes("lunch") || command.includes("dinner") || command.includes("place to eat"))) {
      findRestaurant();
    }
    // Time-based exploration
    else if (command.includes("hours") && command.includes("explore")) {
      const hours = parseInt(command.match(/\d+/)?.[0] || 3);
      planTimeBasedExploration(hours);
    }
    else {
      speak("I'm sorry, I didn't understand that command. You can ask me to plan your day, find a place to eat, or help you explore for a specific number of hours.");
    }
  };

  const planDay = () => {
    const currentHour = new Date().getHours();
    const period = currentHour < 12 ? 'morning' : currentHour < 17 ? 'afternoon' : 'evening';
    
    const sortedAttractions = _.sortBy(mockPlaces.attractions, [
      (place) => -place.rating,
      (place) => place.busyTimes[period]
    ]);

    const schedule = sortedAttractions.slice(0, 3);
    const response = `Here's your plan: Start with ${schedule[0].name} which is perfect for this time. Then head to ${schedule[1].name}, and finish your day at ${schedule[2].name}. Each place has been chosen based on current crowds and ratings.`;
    
    speak(response);
  };

  const findRestaurant = () => {
    const currentHour = new Date().getHours();
    const period = currentHour < 12 ? 'morning' : currentHour < 17 ? 'afternoon' : 'evening';
    
    const filteredRestaurants = mockPlaces.restaurants.filter(restaurant => 
      userPreferences.cuisine.includes(restaurant.cuisine) &&
      restaurant.priceLevel <= userPreferences.priceRange
    );

    const sortedRestaurants = _.sortBy(filteredRestaurants, [
      (rest) => -rest.rating,
      (rest) => rest.busyTimes[period]
    ]);

    const topPicks = sortedRestaurants.slice(0, 3);
    const response = `I recommend these restaurants: 1. ${topPicks[0].name}, known for excellent ${topPicks[0].cuisine} cuisine. 2. ${topPicks[1].name}, and 3. ${topPicks[2].name}. These are selected based on your preferences and current availability.`;
    
    speak(response);
  };

  const planTimeBasedExploration = (hours) => {
    const totalMinutes = hours * 60;
    let remainingTime = totalMinutes;
    const schedule = [];
    
    const sortedPlaces = _.sortBy(mockPlaces.attractions, [(place) => -place.rating]);
    
    for (const place of sortedPlaces) {
      if (remainingTime >= place.timeNeeded + 30) { // Including 30 mins buffer for travel
        schedule.push(place);
        remainingTime -= (place.timeNeeded + 30);
      }
      if (remainingTime < 60) break; // Stop if less than an hour remains
    }

    const response = `For your ${hours}-hour exploration, I suggest: Start at ${schedule[0].name} (${schedule[0].timeNeeded} minutes), then visit ${schedule[1].name} (${schedule[1].timeNeeded} minutes)${schedule[2] ? `, and if time permits, check out ${schedule[2].name}` : ''}. This plan includes travel time between locations.`;
    
    speak(response);
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

        <div className="flex flex-col items-center space-y-4">
          <button
            onClick={toggleListening}
            className={`p-4 rounded-full ${isListening ? 'bg-red-500' : 'bg-blue-500'} text-white shadow-lg hover:opacity-90 transition-opacity`}
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