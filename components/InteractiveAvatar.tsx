"use client";

import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import ElevenLabsAgent from './ElevenLabsAgent';

const AVATAR_URL = "https://models.readyplayer.me/681d8d670bc631a87ab12ef0.glb";

interface AvatarModelProps {
  isSpeaking: boolean;
}

function AvatarModel({ isSpeaking }: AvatarModelProps) {
  const { scene, nodes } = useGLTF(AVATAR_URL) as any;
  const headMeshRef = useRef<THREE.SkinnedMesh>(null!);

  // Find the head mesh (often named 'Wolf3D_Head' or similar) and the mouth blendshape index
  useEffect(() => {
    scene.traverse((object: THREE.Object3D) => {
      if (object instanceof THREE.SkinnedMesh && (object.name.includes('Head') || object.name.includes('head'))) {
        headMeshRef.current = object;
        console.log("Head mesh found:", object.name);
        if (object.morphTargetDictionary) {
          console.log("Available morph targets:", object.morphTargetDictionary);
        }
      }
    });
  }, [scene]);

  useFrame(() => {
    if (headMeshRef.current && headMeshRef.current.morphTargetDictionary) {
      // Attempt to find common mouth opening blendshapes
      const mouthOpenIndex = headMeshRef.current.morphTargetDictionary['mouthOpen'] ?? 
                             headMeshRef.current.morphTargetDictionary['jawOpen'] ?? 
                             headMeshRef.current.morphTargetDictionary['vrc.v_oh']; // Common VRChat viseme
      
      if (mouthOpenIndex !== undefined && headMeshRef.current.morphTargetInfluences) {
        // Smooth transition for mouth opening/closing
        const targetInfluence = isSpeaking ? 0.7 : 0;
        headMeshRef.current.morphTargetInfluences[mouthOpenIndex] = THREE.MathUtils.lerp(
          headMeshRef.current.morphTargetInfluences[mouthOpenIndex],
          targetInfluence,
          0.1 // Smoothing factor
        );
      }
    }
  });

  // Position and scale the avatar to show the full body
  return <primitive 
    object={scene} 
    scale={1.3} 
    position={[0, -1.7, 0]} 
    rotation={[0, 0, 0]}
  />;
}

interface InteractiveAvatarProps {
  agentId?: string;
}

const InteractiveAvatar: React.FC<InteractiveAvatarProps> = ({ agentId = "i1skI47tYw4iyRzDcQBF" }) => {
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-96 h-96 bg-gray-800 border border-gray-500 rounded-lg relative">
        <Canvas camera={{ position: [0, -0.5, 2.5], fov: 45 }}>
          <ambientLight intensity={1.5} />
          <directionalLight position={[3, 5, 2]} intensity={2} castShadow />
          <Suspense fallback={null}>
            <AvatarModel isSpeaking={isAgentSpeaking} />
          </Suspense>
          <OrbitControls enableZoom={true} target={[0, -0.8, 0]} />
        </Canvas>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0">
          Loading...
        </div>
      </div>
      
      <div className="w-full max-w-md">
        <ElevenLabsAgent agentId={agentId} onSpeakingStatusChange={setIsAgentSpeaking} />
      </div>
    </div>
  );
};

export default InteractiveAvatar; 