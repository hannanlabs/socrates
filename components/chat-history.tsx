import { Search } from "lucide-react"

interface ChatItem {
  title: string
  lastMessage: string
  timestamp: string
}

export function ChatHistory() {
  const chatHistory: ChatItem[] = [
    {
      title: "Clarifying Unclear Message",
      lastMessage: "Last message 14 minutes ago",
      timestamp: "14 minutes ago",
    },
    {
      title: "Locked Out of ChatGPT Account",
      lastMessage: "Last message 4 months ago",
      timestamp: "4 months ago",
    },
    {
      title: "Check yfinance version on terminal",
      lastMessage: "Last message 4 months ago",
      timestamp: "4 months ago",
    },
    {
      title: "Leveraging Social Media to Advance an Artist's Career",
      lastMessage: "Last message 4 months ago",
      timestamp: "4 months ago",
    },
    {
      title: "Password Composition Fundamentals",
      lastMessage: "Last message 4 months ago",
      timestamp: "4 months ago",
    },
    {
      title: "Untitled",
      lastMessage: "Last message 4 months ago",
      timestamp: "4 months ago",
    },
  ]

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-light text-gray-200">Your chat history</h1>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
        <input
          type="text"
          placeholder="Search your chats..."
          className="w-full bg-[#222222] border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-600"
        />
      </div>

      <div className="mb-6">
        <p className="text-gray-300">
          You have previous chats 
        </p>
      </div>

      <div className="space-y-3">
        {chatHistory.map((chat, index) => (
          <div
            key={index}
            className="bg-[#222222] border border-gray-700 rounded-lg p-4 hover:bg-[#2A2A2A] cursor-pointer"
          >
            <h3 className="text-gray-200 font-medium">{chat.title}</h3>
            <p className="text-gray-400 text-sm">{chat.lastMessage}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
