import { notFound } from "next/navigation";
import { PlaygroundClient } from "./playground-client";

export const metadata = {
  title: "Playground — MaurIA",
};

export default function PlaygroundPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <PlaygroundClient />;
}
