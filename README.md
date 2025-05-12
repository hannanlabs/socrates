# Socrates: Empower Your Curiosity

Socrates is your all-in-one AI companion designed to help you learn, explore, and create with ease. Whether you’re brainstorming the next big business plan, working through tough homework assignments, or simply diving into new topics for personal growth, Socrates is here to guide you every step of the way.

## What Socrates Can Do for You

• **Homework Helper**  
  Transform complex topics into clear, concise explanations. Stuck on a physics problem or a history essay? Socrates illuminates the path to understanding, pointing you in the right direction without giving away all the fun of discovery.

• **Assignment Navigator**  
  From outlining your next research paper to proofreading your final drafts, Socrates brings structure and support to help you excel. Focus on your creativity while offloading tricky details of planning, referencing, and formatting.

• **Business & Project Partner**  
  Thinking about a new startup idea or need help refining a business model? Socrates offers valuable insights and brainstorming prompts to elevate your plans. With vast knowledge at hand, it’s like having your own board of advisors on speed dial.

• **Endless Inspiration**  
  Learning never stops. Socrates sparks curiosity with surprising angles and deep, reasoned logic—helping you discover new interests, explore side projects, or just satisfy your fascination with the world.

## Setting Up Your ElevenLabs Agent and API Key

1. Create an ElevenLabs account if you haven’t already.
2. Go to the “Conversational AI” tab.
3. Create a new Agent:  
   • Name it “Socrates.”  
   • Enter a first message like: “I’m Socrates, super pumped to talk to you!”  
   • Use this System Prompt:

       You are Socrates, an AI avatar with access to a domain-specific knowledge base. Your primary role is to help users understand their homework or assignments, providing clear explanations and context from the knowledge base documents. If the user specifically asks to debate, you then switch to a debate-focused approach, asking direct, probing questions and presenting counterpoints. Otherwise, you offer helpful, thorough explanations.

       Guidelines:
       • When the user asks about documents, coursework, or any factual questions, provide detailed context and clarifications, referencing information from the knowledge base.
       • If the user explicitly requests a debate or argument, then challenge their ideas by testing assumptions and offering counterarguments in a concise, direct manner.
       • Avoid filler language and metaphors; stay clear and to the point.
       • If the user requests unfiltered feedback, drop all hedging and state critiques frankly.
       • When debating, end your response with a question that pushes the discussion forward. Otherwise, simply provide relevant information and ensure the user walks away with a clearer understanding.

   • Enable “Use RAG.”

4. Go to the “Widget” tab on the agent, copy the Agent ID, then paste it into the “Settings” tab of your project. 
5. Click on your profile (My workspace) at the bottom-left corner, choose “API Keys,” create an API key, and copy it. Paste that key into the “Settings” tab as well.

That’s it! You’ve finished the setup for Socrates with ElevenLabs.
