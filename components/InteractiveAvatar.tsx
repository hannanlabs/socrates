"use client";

import React, { useRef, useState, useMemo, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import ElevenLabsAgent, { TranscriptEntry } from './ElevenLabsAgent';
import { createNewChat, addMessageToChat } from "@/lib/supabase/chat-service";
import { useAuth } from "@/lib/supabase/auth-context";

interface InteractiveAvatarProps {
  agentId?: string;
}

// An animated particle system that responds to speaking state
const AudioVisualizer = ({ isSpeaking }: { isSpeaking: boolean }) => {
  // Create a group to hold all particles
  const groupRef = useRef<THREE.Group>(null!);
  
  // Create particles
  const particleCount = 200;
  const particles = useMemo(() => {
    return Array.from({ length: particleCount }).map((_, i) => ({
      position: [
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ],
      // Random radius between 0.02 and 0.06
      radius: 0.02 + Math.random() * 0.04,
      // Random color
      color: new THREE.Color(
        0.5 + Math.random() * 0.5, // r
        0.5 + Math.random() * 0.5, // g
        0.5 + Math.random() * 0.5  // b
      ),
      // Random speed of rotation
      speed: 0.2 + Math.random() * 0.8,
      // Random axis of rotation
      axis: new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize()
    }));
  }, []);
  
  // Animation logic
  useFrame((state, delta) => {
    if (groupRef.current) {
      // Rotate the entire group slowly
      groupRef.current.rotation.y += delta * 0.1;
      
      // Update each particle
      groupRef.current.children.forEach((particle, i) => {
        if (particle instanceof THREE.Mesh) {
          // Get the particle data
          const data = particles[i];
          
          // Rotate around its axis
          const rotationSpeed = isSpeaking ? data.speed * 2 : data.speed;
          particle.rotateOnAxis(data.axis, delta * rotationSpeed);
          
          // Scale based on speaking state and time
          const scaleBase = isSpeaking 
            ? 0.7 + Math.sin(state.clock.elapsedTime * 5 + i) * 0.3
            : 0.9 + Math.sin(state.clock.elapsedTime * 2 + i) * 0.1;
            
          particle.scale.setScalar(data.radius * scaleBase);
          
          // Color pulsing when speaking
          if (particle.material instanceof THREE.MeshStandardMaterial) {
            if (isSpeaking) {
              const hue = (state.clock.elapsedTime * 0.1 + i * 0.01) % 1;
              particle.material.color.setHSL(hue, 0.8, 0.6);
              particle.material.emissive.setHSL(hue, 0.8, 0.3);
            } else {
              particle.material.color.copy(data.color);
              particle.material.emissive.set(0, 0, 0);
            }
          }
        }
      });
    }
  });
  
  return (
    <group ref={groupRef}>
      {particles.map((particle, i) => (
        <mesh key={i} position={particle.position as [number, number, number]}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial 
            color={particle.color}
            roughness={0.3} 
            metalness={0.8}
          />
        </mesh>
      ))}
    </group>
  );
};

// A floating logo with glowing effect
const FloatingLogo = ({ isSpeaking }: { isSpeaking: boolean }) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  
  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating animation
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      meshRef.current.rotation.y += 0.005;
      
      // Pulse effect when speaking
      if (isSpeaking) {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 8) * 0.05;
        meshRef.current.scale.set(scale, scale, scale);
      } else {
        meshRef.current.scale.setScalar(1);
      }
    }
  });
  
  return (
    <mesh ref={meshRef}>
      <torusKnotGeometry args={[0.7, 0.3, 128, 32, 2, 3]} />
      <meshStandardMaterial 
        color={isSpeaking ? "#cc0033" : "#990033"} 
        roughness={0.3}
        metalness={0.7}
        emissive={isSpeaking ? "#cc0033" : "#330011"}
        emissiveIntensity={isSpeaking ? 0.5 : 0.1}
      />
    </mesh>
  );
};

const InteractiveAvatar: React.FC<InteractiveAvatarProps> = ({ agentId = "XR5yYfHH1SN8fjv699UX" }) => {
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const { user } = useAuth();

  const handleConversationEnd = useCallback(async (transcript: TranscriptEntry[]) => {
    if (!transcript || transcript.length === 0) {
      console.log("No transcript to save.");
      return;
    }
    if (!user) {
        console.error("User not authenticated. Cannot save transcript.");
        // Optionally, notify the user or queue the transcript for later saving
        return;
    }

    console.log("Conversation ended. Transcript:", transcript);

    // Find the first user message to create the chat
    const firstUserMessage = transcript.find(entry => entry.speaker === 'user');
    if (!firstUserMessage) {
      console.error("No user messages in transcript to create chat.");
      return;
    }

    try {
      // 1. Create a new chat session with the first user message
      // Assuming createNewChat takes the message text and returns a chatId.
      // You might need to adjust this if createNewChat expects a user ID or other params.
      console.log("Creating new chat with first message:", firstUserMessage.text);
      const chatId = await createNewChat(firstUserMessage.text);

      if (chatId) {
        console.log("New chat created with ID:", chatId);
        // 2. Add all messages (including the first one if your createNewChat doesn't add it)
        //    to the chat session.
        //    For simplicity, let's assume createNewChat adds the first message.
        //    So we iterate from the second message onwards if the first one was user.
        //    Or, a more robust way: iterate all and let addMessageToChat handle duplicates if any,
        //    or ensure addMessageToChat is idempotent, or filter out the exact first message.

        // Let's iterate all messages after the first one used to create chat.
        const messagesToSave = transcript.slice(transcript.indexOf(firstUserMessage) + 1);

        // Or if createNewChat does NOT save the first message, use this:
        // const messagesToSave = transcript;

        for (const entry of messagesToSave) {
            console.log(`Adding message to chat ${chatId}:`, entry);
            await addMessageToChat(chatId, entry.speaker, entry.text);
        }
        console.log("All messages added to Supabase.");
      } else {
        console.error("Failed to create new chat session in Supabase.");
      }
    } catch (error) {
      console.error("Error saving transcript to Supabase:", error);
    }
  }, [user]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-96 h-96 bg-gray-800 border border-gray-500 rounded-lg relative">
        <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <spotLight position={[5, 5, 5]} intensity={0.8} castShadow />
          <pointLight position={[-5, -5, -5]} intensity={0.5} color="#cc0033" />
          
          {/* Dynamic floating logo */}
          <FloatingLogo isSpeaking={isAgentSpeaking} />
          
          {/* Particle system */}
          <AudioVisualizer isSpeaking={isAgentSpeaking} />
        </Canvas>
      </div>
      
      <div className="w-full max-w-md">
        <ElevenLabsAgent 
          agentId={agentId} 
          onSpeakingStatusChange={setIsAgentSpeaking} 
          onConversationEnd={handleConversationEnd}
        />
      </div>
    </div>
  );
};

export default InteractiveAvatar; 