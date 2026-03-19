import React, { createContext, useState, useEffect } from "react";
import { getJSON, setJSON } from "../src/utils/storage";

type ProfileContextType = {
  name: string;
  primaryFocus: string;
  onboardingComplete: boolean;
  completeOnboarding: (name: string, focus: string) => void;
};

export const ProfileContext = createContext<ProfileContextType>({
  name: "",
  primaryFocus: "",
  onboardingComplete: false,
  completeOnboarding: () => {},
});

export const ProfileProvider = ({ children }: any) => {
  const [name, setName] = useState("");
  const [primaryFocus, setPrimaryFocus] = useState("");
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const parsed = await getJSON<{ name?: string; primaryFocus?: string; onboardingComplete?: boolean }>(
        "profileData",
        {}
      );
      setName(parsed.name || "");
      setPrimaryFocus(parsed.primaryFocus || "");
      setOnboardingComplete(parsed.onboardingComplete || false);
    };

    loadProfile();
  }, []);

  const completeOnboarding = async (userName: string, focus: string) => {
    const profile = {
      name: userName,
      primaryFocus: focus,
      onboardingComplete: true,
    };

    await setJSON("profileData", profile);

    setName(userName);
    setPrimaryFocus(focus);
    setOnboardingComplete(true);
  };

  return (
    <ProfileContext.Provider
      value={{
        name,
        primaryFocus,
        onboardingComplete,
        completeOnboarding,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};
