import { createFileRoute } from "@tanstack/react-router";
import { ReviewScreen } from "@/components/review-screen";

export const Route = createFileRoute("/")({
  component: ReviewScreen,
});
