import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tasks - LifeFlow",
  description:
    "Capture tasks and link them to the goals they serve",
};

export default function TasksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}