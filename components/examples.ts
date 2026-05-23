import type { StructuredAnswers } from "@/lib/types";

export interface Example {
  title: string;
  blurb: string;
  description: string;
  structured?: StructuredAnswers;
}

export const EXAMPLES: Example[] = [
  {
    title: "Telegram Sales Bot",
    blurb: "RSAs get nightly nudges via Telegram with their next-day priorities.",
    description:
      "A Telegram bot that messages each RSA every evening with their close rate, top opportunities to follow up on tomorrow, and a one-tap way to confirm callbacks. Manager gets a digest of who's actively engaging the bot.",
    structured: {
      audience: "RSAs and store managers",
      trigger: "Nightly at 6:30pm local time",
      decision: "What to do tomorrow morning",
      frequency: "Daily",
      success: "Higher close rate at the RSAs who use it 4+ days per week",
    },
  },
  {
    title: "Variance Coaching Dashboard",
    blurb:
      "Every store's daily variance vs plan with AI-drafted coaching talking points.",
    description:
      "A daily dashboard showing every store's net sales variance to plan with AI-drafted coaching notes for the regional director to use on their morning calls with store managers.",
    structured: {
      audience: "Regional directors",
      trigger: "Each morning at 7am",
      decision: "Which stores need a coaching call and what to say",
      frequency: "Daily weekdays",
      success: "Faster closure of underperforming days; fewer 3+ day slumps",
    },
  },
  {
    title: "Cancellation Save Queue",
    blurb:
      "An inbox of pending cancellations with AI-suggested retention offers for CSRs.",
    description:
      "An inbox view of pending furniture order cancellations with reason analysis, suggested retention offers, and a one-click way to reach out before the order is voided.",
    structured: {
      audience: "CSRs and managers",
      trigger: "When a customer requests cancellation",
      decision: "Offer to save, escalate, or release",
      frequency: "Throughout business hours",
      success: "5+ point reduction in cancellation rate within 90 days",
    },
  },
];
