import {
  Sun, Brain, Dumbbell, Sparkles, BookOpen,
  Laptop, Wallet, Users, House, Rocket,
} from "lucide-react"

export type PresetTask = {
  title: string
  description?: string
  priority: number
  recurrenceRule?: string
}

export type PresetCategory = {
  id: string
  title: string
  icon: typeof Sun  // any Lucide icon type
  tasks: PresetTask[]
}

export const presetCategories: PresetCategory[] = [
  {
    id: "rise-prime",
    title: "Rise & Prime",
    icon: Sun,
    tasks: [
      { title: "Drink 500ml of water", priority: 1, recurrenceRule: "daily", description: "Rehydrate after sleep" },
      { title: "Make your bed", priority: 2, recurrenceRule: "daily" },
      { title: "Stretch for 5 minutes", priority: 2, recurrenceRule: "daily" },
      { title: "Review today's schedule", priority: 2, recurrenceRule: "daily" },
      { title: "Write your Top 3 priorities", priority: 1, recurrenceRule: "daily" },
      { title: "Avoid your phone for 30 minutes", priority: 2, recurrenceRule: "daily" },
      { title: "Get morning sunlight", priority: 2, recurrenceRule: "daily" },
      { title: "Practice 5 minutes of deep breathing", priority: 3, recurrenceRule: "daily" },
      { title: "Read a motivational quote", priority: 4, recurrenceRule: "daily" },
      { title: "Start work before 9 AM", priority: 2, recurrenceRule: "daily" },
    ],
  },
  {
    id: "focus-mode",
    title: "Focus Mode",
    icon: Brain,
    tasks: [
      { title: "Complete one Deep Work session (90 min)", priority: 1, recurrenceRule: "daily" },
      { title: "Enable Do Not Disturb", priority: 2, recurrenceRule: "daily" },
      { title: "Finish your Most Important Task", priority: 1, recurrenceRule: "daily" },
      { title: "Clear your workspace", priority: 2, recurrenceRule: "daily" },
      { title: "Plan tomorrow before finishing work", priority: 2, recurrenceRule: "daily" },
      { title: "Batch small tasks together", priority: 3, recurrenceRule: "daily" },
      { title: "Review today's progress", priority: 2, recurrenceRule: "daily" },
      { title: "Avoid multitasking", priority: 2, recurrenceRule: "daily" },
      { title: "Close unnecessary browser tabs", priority: 4, recurrenceRule: "daily" },
      { title: "Spend less than 30 min on social media", priority: 2, recurrenceRule: "daily" },
    ],
  },
  {
    id: "iron-body",
    title: "Iron Body",
    icon: Dumbbell,
    tasks: [
      { title: "Complete today's workout", priority: 1, recurrenceRule: "daily" },
      { title: "Hit your protein goal", priority: 1, recurrenceRule: "daily" },
      { title: "Drink 3L of water", priority: 1, recurrenceRule: "daily" },
      { title: "Walk 8,000+ steps", priority: 2, recurrenceRule: "daily" },
      { title: "Stretch after training", priority: 2, recurrenceRule: "daily" },
      { title: "Sleep at least 7 hours", priority: 1, recurrenceRule: "daily" },
      { title: "Track today's weight", priority: 4, recurrenceRule: "daily" },
      { title: "Prepare healthy meals", priority: 2, recurrenceRule: "daily" },
      { title: "Avoid sugary drinks", priority: 2, recurrenceRule: "daily" },
      { title: "Stand and move every hour", priority: 3, recurrenceRule: "daily" },
    ],
  },
  {
    id: "mind-reset",
    title: "Mind Reset",
    icon: Sparkles,
    tasks: [
      { title: "Meditate for 10 minutes", priority: 2, recurrenceRule: "daily" },
      { title: "Journal your thoughts", priority: 2, recurrenceRule: "daily" },
      { title: "Write 3 things you're grateful for", priority: 2, recurrenceRule: "daily" },
      { title: "Practice box breathing", priority: 3, recurrenceRule: "daily" },
      { title: "Spend 15 minutes without screens", priority: 2, recurrenceRule: "daily" },
      { title: "Listen to relaxing music", priority: 4, recurrenceRule: "daily" },
      { title: "Reflect on today's wins", priority: 2, recurrenceRule: "daily" },
      { title: "Write one lesson learned", priority: 3, recurrenceRule: "daily" },
      { title: "Go outside for fresh air", priority: 2, recurrenceRule: "daily" },
      { title: "End the day with a positive thought", priority: 3, recurrenceRule: "daily" },
    ],
  },
  {
    id: "knowledge-vault",
    title: "Knowledge Vault",
    icon: BookOpen,
    tasks: [
      { title: "Read 20 pages", priority: 2, recurrenceRule: "daily" },
      { title: "Study Spanish for 15 minutes", priority: 2, recurrenceRule: "daily" },
      { title: "Complete one lesson of an online course", priority: 2, recurrenceRule: "daily" },
      { title: "Watch one technical tutorial", priority: 3, recurrenceRule: "weekly" },
      { title: "Listen to an educational podcast", priority: 4, recurrenceRule: "daily" },
      { title: "Read one AI article", priority: 3, recurrenceRule: "weekly" },
      { title: "Learn one new Python concept", priority: 3, recurrenceRule: "weekly" },
      { title: "Learn one new SQL concept", priority: 3, recurrenceRule: "weekly" },
      { title: "Take notes on what you learned", priority: 2, recurrenceRule: "daily" },
      { title: "Review yesterday's notes", priority: 3, recurrenceRule: "daily" },
    ],
  },
  {
    id: "builders-lab",
    title: "Builder's Lab",
    icon: Laptop,
    tasks: [
      { title: "Code for one hour", priority: 1, recurrenceRule: "daily" },
      { title: "Push code to GitHub", priority: 2, recurrenceRule: "daily" },
      { title: "Review one pull request", priority: 3, recurrenceRule: "weekly" },
      { title: "Improve one feature in LifeFlow", priority: 2, recurrenceRule: "weekly" },
      { title: "Refactor existing code", priority: 3, recurrenceRule: "weekly" },
      { title: "Fix one bug", priority: 2, recurrenceRule: "weekly" },
      { title: "Learn one new framework feature", priority: 3, recurrenceRule: "weekly" },
      { title: "Practice SQL queries", priority: 3, recurrenceRule: "weekly" },
      { title: "Study cloud or DevOps concepts", priority: 3, recurrenceRule: "weekly" },
      { title: "Update project documentation", priority: 4, recurrenceRule: "monthly" },
    ],
  },
  {
    id: "money-engine",
    title: "Money Engine",
    icon: Wallet,
    tasks: [
      { title: "Track today's spending", priority: 2, recurrenceRule: "daily" },
      { title: "Record every expense", priority: 2, recurrenceRule: "daily" },
      { title: "Review your budget", priority: 2, recurrenceRule: "weekly" },
      { title: "Read one investing article", priority: 3, recurrenceRule: "weekly" },
      { title: "Check your investment portfolio", priority: 3, recurrenceRule: "weekly" },
      { title: "Save money this week", priority: 2, recurrenceRule: "weekly" },
      { title: "Avoid unnecessary purchases", priority: 2, recurrenceRule: "daily" },
      { title: "Review NSE market news", priority: 3, recurrenceRule: "weekly" },
      { title: "Learn one finance concept", priority: 3, recurrenceRule: "weekly" },
      { title: "Update your net worth", priority: 4, recurrenceRule: "monthly" },
    ],
  },
  {
    id: "relationships",
    title: "Relationships",
    icon: Users,
    tasks: [
      { title: "Call a family member", priority: 2, recurrenceRule: "weekly" },
      { title: "Spend quality time with your partner", priority: 1, recurrenceRule: "daily" },
      { title: "Send a thoughtful message", priority: 3, recurrenceRule: "weekly" },
      { title: "Practice active listening", priority: 2, recurrenceRule: "daily" },
      { title: "Give someone a genuine compliment", priority: 4, recurrenceRule: "daily" },
      { title: "Help someone today", priority: 3, recurrenceRule: "daily" },
      { title: "Meet a friend", priority: 3, recurrenceRule: "weekly" },
      { title: "Express appreciation", priority: 2, recurrenceRule: "daily" },
      { title: "Network with a professional", priority: 4, recurrenceRule: "monthly" },
      { title: "Limit phone use during conversations", priority: 2, recurrenceRule: "daily" },
    ],
  },
  {
    id: "reset-zone",
    title: "Reset Zone",
    icon: House,
    tasks: [
      { title: "Make your bed", priority: 2, recurrenceRule: "daily" },
      { title: "Tidy your workspace", priority: 2, recurrenceRule: "daily" },
      { title: "Wash dishes", priority: 3, recurrenceRule: "daily" },
      { title: "Organize one drawer", priority: 4, recurrenceRule: "weekly" },
      { title: "Vacuum or sweep", priority: 3, recurrenceRule: "weekly" },
      { title: "Take out the trash", priority: 2, recurrenceRule: "weekly" },
      { title: "Do laundry", priority: 3, recurrenceRule: "weekly" },
      { title: "Clean your desk", priority: 2, recurrenceRule: "daily" },
      { title: "Water plants", priority: 3, recurrenceRule: "weekly" },
      { title: "Prepare tomorrow's workspace", priority: 2, recurrenceRule: "daily" },
    ],
  },
  {
    id: "level-up",
    title: "Level Up",
    icon: Rocket,
    tasks: [
      { title: "Define one weekly goal", priority: 1, recurrenceRule: "weekly" },
      { title: "Review weekly progress", priority: 1, recurrenceRule: "weekly" },
      { title: "Plan tomorrow", priority: 2, recurrenceRule: "daily" },
      { title: "Identify one habit to improve", priority: 2, recurrenceRule: "weekly" },
      { title: "Read one chapter of a business book", priority: 3, recurrenceRule: "weekly" },
      { title: "Brainstorm one new project idea", priority: 3, recurrenceRule: "monthly" },
      { title: "Review your LifeFlow analytics", priority: 2, recurrenceRule: "weekly" },
      { title: "Write one future goal", priority: 2, recurrenceRule: "weekly" },
      { title: "Celebrate one achievement", priority: 2, recurrenceRule: "weekly" },
      { title: "Do something outside your comfort zone", priority: 2, recurrenceRule: "monthly" },
    ],
  },
]