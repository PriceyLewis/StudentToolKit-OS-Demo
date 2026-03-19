import React, { createContext, useCallback, useState, useEffect } from "react";
import { getJSON, removeKey, setJSON } from "../src/utils/storage";

type ProfileContextType = {
  name: string;
  primaryFocus: string;
  onboardingComplete: boolean;
  completeOnboarding: (name: string, focus: string) => void;
  resetProfile: () => Promise<void>;
  rehydrateProfile: () => Promise<void>;
};

export const ProfileContext = createContext<ProfileContextType>({
  name: "",
  primaryFocus: "",
  onboardingComplete: false,
  completeOnboarding: () => {},
  resetProfile: async () => {},
  rehydrateProfile: async () => {},
});

export const ProfileProvider = ({ children }: any) => {
  const [name, setName] = useState("");
  const [primaryFocus, setPrimaryFocus] = useState("");
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  const rehydrateProfile = useCallback(async () => {
    const parsed = await getJSON<{ name?: string; primaryFocus?: string; onboardingComplete?: boolean }>(
      "profileData",
      {}
    );
    setName(parsed.name || "");
    setPrimaryFocus(parsed.primaryFocus || "");
    setOnboardingComplete(parsed.onboardingComplete || false);
  }, []);

  useEffect(() => {
    rehydrateProfile();
  }, [rehydrateProfile]);

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

  const resetProfile = async () => {
    await removeKey("profileData");
    setName("");
    setPrimaryFocus("");
    setOnboardingComplete(false);
  };

  return (
    <ProfileContext.Provider
      value={{
        name,
        primaryFocus,
        onboardingComplete,
        completeOnboarding,
        resetProfile,
        rehydrateProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};
