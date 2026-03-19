import { useContext } from "react";
import { ProfileContext } from "../context/ProfileContext";
import Dashboard from "./dashboard";
import Onboarding from "./onboarding";

export default function Index() {
  const { onboardingComplete } = useContext(ProfileContext);

  if (!onboardingComplete) {
    return <Onboarding />;
  }

  return <Dashboard />;
}
