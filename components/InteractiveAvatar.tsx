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
  const chatIdRef = useRef<string | null>(null);

  // Handler for new messages coming from ElevenLabsAgent
  const handleNewMessage = useCallback(async (message: TranscriptEntry) => {
    if (!user) {
      console.error("User not authenticated. Cannot save message.");
      return;
    }

    console.log("New message received:", message);

    try {
      // If we don't have a chat ID yet and this is a user message, create a new chat
      if (!chatIdRef.current && message.speaker === 'user') {
        console.log("Creating new chat with message:", message.text);
        const newChatId = await createNewChat(message.text);
        
        if (newChatId) {
          console.log("New chat created with ID:", newChatId);
          chatIdRef.current = newChatId;
        } else {
          console.error("Failed to create chat session in Supabase.");
          return;
        }
      } 
      // If this is an AI message or a subsequent user message, add it to the existing chat
      else if (chatIdRef.current) {
        console.log(`Adding message to chat ${chatIdRef.current}:`, message);
        await addMessageToChat(chatIdRef.current, message.speaker, message.text);
      }
      // If we have a first message from AI without a chat created yet, create a chat first
      else if (message.speaker === 'assistant' && !chatIdRef.current) {
        console.log("Creating new chat for AI response with placeholder user message");
        const newChatId = await createNewChat("New conversation");
        
        if (newChatId) {
          console.log("New chat created with ID:", newChatId);
          chatIdRef.current = newChatId;
          console.log(`Adding AI message to chat ${chatIdRef.current}:`, message);
          await addMessageToChat(chatIdRef.current, message.speaker, message.text);
        } else {
          console.error("Failed to create chat session in Supabase.");
          return;
        }
      }

    } catch (error) {
      console.error("Error saving message to Supabase:", error);
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
          onNewMessage={handleNewMessage}
        />
      </div>
    </div>
  );
};

export default InteractiveAvatar; 