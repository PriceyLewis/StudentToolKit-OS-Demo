import { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { PerformanceContext } from "../context/PerformanceContext";
import { useThemedStyles, type AppThemeTokens } from "../context/theme";
import { getJSON, setJSON } from "../src/utils/storage";

const CV_FORM_STORAGE_KEY = "cvFormState";
type TemplateId = "modern" | "classic" | "minimal" | "executive";

type Suggestion = {
  id: string;
  title: string;
  detail: string;
  priority: 1 | 2 | 3;
};

export default function CVScreen() {
  const styles = useThemedStyles(createStyles);
  const [template, setTemplate] = useState<TemplateId>("modern");
  const [name, setName] = useState("");
  const [education, setEducation] = useState("");
  const [skills, setSkills] = useState("");
  const [experience, setExperience] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [summary, setSummary] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);
  const screenFade = useRef(new Animated.Value(0)).current;

  const { setCareerScore, academicScore, fitnessScore, hustleScore } = useContext(PerformanceContext);

  const templateMeta: { id: TemplateId; label: string; description: string }[] = [
    { id: "modern", label: "Modern", description: "Clean and startup-friendly." },
    { id: "classic", label: "Classic", description: "Traditional and academic." },
    { id: "minimal", label: "Minimal", description: "Compact and ATS-lean." },
    { id: "executive", label: "Executive", description: "Structured and leadership-first." },
  ];

  const parsedSkills = useMemo(
    () => skills.split(",").map((s) => s.trim()).filter(Boolean),
    [skills]
  );

  const calculateCareerScore = () => {
    let score = 0;
    if (name.length > 2) score += 15;
    if (email.length > 5) score += 15;
    if (summary.length > 20) score += 20;
    if (parsedSkills.length >= 3) score += 25;
    if (experience.length > 20) score += 25;
    return Math.min(score, 100);
  };

  const careerScore = calculateCareerScore();

  useEffect(() => {
    setCareerScore(careerScore);
  }, [careerScore, setCareerScore]);

  useEffect(() => {
    Animated.timing(screenFade, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [screenFade]);

  useEffect(() => {
    const loadFormState = async () => {
      try {
        const parsed = await getJSON<{
          template?: TemplateId;
          name?: string;
          education?: string;
          skills?: string;
          experience?: string;
          email?: string;
          phone?: string;
          summary?: string;
        } | null>(CV_FORM_STORAGE_KEY, null);
        if (!parsed) {
          return;
        }

        setTemplate(parsed.template ?? "modern");
        setName(parsed.name ?? "");
        setEducation(parsed.education ?? "");
        setSkills(parsed.skills ?? "");
        setExperience(parsed.experience ?? "");
        setEmail(parsed.email ?? "");
        setPhone(parsed.phone ?? "");
        setSummary(parsed.summary ?? "");
      } catch (error) {
        console.error("Failed to load CV form state", error);
      } finally {
        setIsHydrated(true);
      }
    };

    loadFormState();
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const saveFormState = async () => {
      try {
        await setJSON(CV_FORM_STORAGE_KEY, {
          template,
          name,
          education,
          skills,
          experience,
          email,
          phone,
          summary,
        });
      } catch (error) {
        console.error("Failed to save CV form state", error);
      }
    };

    saveFormState();
  }, [isHydrated, template, name, education, skills, experience, email, phone, summary]);

  const suggestions = useMemo<Suggestion[]>(() => {
    const items: Suggestion[] = [];

    if (summary.trim().length < 60) {
      items.push({
        id: "summary-length",
        title: "Strengthen your summary",
        detail: "Write 2-3 lines with target role, domain, and strongest outcome.",
        priority: 1,
      });
    }

    if (parsedSkills.length < 5) {
      items.push({
        id: "skills-density",
        title: "Add core skill keywords",
        detail: "Aim for at least 5 relevant skills to improve scanability.",
        priority: 1,
      });
    }

    if (!/\d/.test(experience)) {
      items.push({
        id: "experience-metrics",
        title: "Quantify experience",
        detail: "Add at least one measurable result, e.g. 'reduced turnaround by 20%'.",
        priority: 1,
      });
    }

    if (!education.trim()) {
      items.push({
        id: "education-missing",
        title: "Complete education section",
        detail: "Add your institution, course, and expected or actual graduation.",
        priority: 2,
      });
    }

    if (!phone.trim() || !email.trim()) {
      items.push({
        id: "contact",
        title: "Complete contact information",
        detail: "Include both email and phone so recruiters can respond quickly.",
        priority: 2,
      });
    }

    const weakestArea = [
      { key: "academic", score: academicScore },
      { key: "fitness", score: fitnessScore },
      { key: "hustle", score: hustleScore },
    ].sort((a, b) => a.score - b.score)[0];

    if (weakestArea.score < 40) {
      items.push({
        id: "focus-signal",
        title: "Add growth signal",
        detail:
          weakestArea.key === "academic"
            ? "Include relevant coursework or certifications to strengthen your profile."
            : weakestArea.key === "hustle"
              ? "Highlight freelance, internship, or project outcomes to show initiative."
              : "Add a short line on discipline and consistency habits in your summary.",
        priority: 3,
      });
    }

    return items.sort((a, b) => a.priority - b.priority).slice(0, 4);
  }, [academicScore, education, email, experience, fitnessScore, hustleScore, parsedSkills.length, phone, summary]);

  const escapeHtml = (input: string) =>
    input
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const exportPDF = async () => {
    const skillsList = parsedSkills.map((skill) => `<li>${escapeHtml(skill)}</li>`).join("");

    const modernStyle = `
      <style>
        body { font-family: Arial; padding: 40px; }
        .accent { border-left: 6px solid #2563EB; padding-left: 20px; }
        h1 { margin-bottom: 5px; }
        h2 { margin-top: 25px; }
      </style>
    `;

    const classicStyle = `
      <style>
        body { font-family: Times New Roman; padding: 40px; }
        h1 { border-bottom: 2px solid black; padding-bottom: 10px; }
        h2 { margin-top: 25px; }
      </style>
    `;

    const minimalStyle = `
      <style>
        body { font-family: Helvetica; padding: 36px; color: #111827; }
        h1 { margin-bottom: 0; letter-spacing: 0.3px; }
        h2 { margin-top: 20px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
        ul { padding-left: 18px; }
      </style>
    `;

    const executiveStyle = `
      <style>
        body { font-family: Georgia; padding: 44px; color: #111827; }
        .accent { border: 1px solid #111827; padding: 20px; }
        h1 { margin: 0; text-transform: uppercase; letter-spacing: 1px; }
        h2 { margin-top: 22px; border-bottom: 1px solid #D1D5DB; padding-bottom: 6px; }
        ul { padding-left: 18px; }
      </style>
    `;

    const templateStyleMap: Record<TemplateId, string> = {
      modern: modernStyle,
      classic: classicStyle,
      minimal: minimalStyle,
      executive: executiveStyle,
    };

    const html = `
      <html>
        <head>${templateStyleMap[template]}</head>
        <body>
          <div class="${template === "modern" || template === "executive" ? "accent" : ""}">
            <h1>${escapeHtml(name)}</h1>
            <p style="color: grey;">${escapeHtml(email)}${email && phone ? " | " : ""}${escapeHtml(phone)}</p>
            <h2>Professional Summary</h2>
            <p>${escapeHtml(summary)}</p>
            <h2>Education</h2>
            <p>${escapeHtml(education)}</p>
            <h2>Skills</h2>
            <ul>${skillsList}</ul>
            <h2>Experience</h2>
            <p>${escapeHtml(experience)}</p>
          </div>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri);
  };

  const isPreviewEmpty =
    !name.trim() &&
    !email.trim() &&
    !phone.trim() &&
    !summary.trim() &&
    !education.trim() &&
    parsedSkills.length === 0 &&
    !experience.trim();

  return (
    <Animated.ScrollView contentContainerStyle={styles.container} style={{ opacity: screenFade }}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Career Profile</Text>
        <Text style={styles.title}>Professional Profile Planner</Text>
        <Text style={styles.subtitle}>
          Draft a cleaner, more credible CV with export-ready templates and built-in improvement prompts.
        </Text>
        <View style={styles.heroStatsRow}>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>Career score</Text>
            <Text style={styles.heroStatValue}>{careerScore}/100</Text>
          </View>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>Template</Text>
            <Text style={styles.heroStatValue}>{templateMeta.find((item) => item.id === template)?.label}</Text>
          </View>
        </View>
      </View>

      <View style={styles.templateRow}>
        {templateMeta.map((item) => (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.8}
            style={[styles.templateButton, template === item.id && styles.active]}
            onPress={() => setTemplate(item.id)}
          >
            <Text style={styles.templateLabel}>{item.label}</Text>
            <Text style={styles.templateDescription}>{item.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput placeholder="Full Name" value={name} style={styles.input} onChangeText={setName} />
      <TextInput placeholder="Email" value={email} style={styles.input} onChangeText={setEmail} />
      <TextInput placeholder="Phone" value={phone} style={styles.input} onChangeText={setPhone} />
      <TextInput
        placeholder="Professional Summary"
        value={summary}
        style={[styles.input, { height: 80 }]}
        multiline
        onChangeText={setSummary}
      />
      <TextInput placeholder="Education" value={education} style={styles.input} onChangeText={setEducation} />
      <TextInput
        placeholder="Skills (comma separated)"
        value={skills}
        style={styles.input}
        onChangeText={setSkills}
      />
      <TextInput placeholder="Experience" value={experience} style={styles.input} onChangeText={setExperience} />

      <View style={styles.suggestionCard}>
        <Text style={styles.suggestionTitle}>Smart suggestions</Text>
        {suggestions.length ? (
          suggestions.map((item) => (
            <View key={item.id} style={styles.suggestionRow}>
              <Text style={styles.suggestionRowTitle}>{item.title}</Text>
              <Text style={styles.suggestionRowBody}>{item.detail}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.suggestionDone}>
            Profile looks strong. Export to PDF when ready.
          </Text>
        )}
      </View>

      <View
        style={[
          styles.preview,
          template === "modern"
            ? styles.modernPreview
            : template === "classic"
              ? styles.classicPreview
              : template === "minimal"
                ? styles.minimalPreview
                : styles.executivePreview,
        ]}
      >
        {isPreviewEmpty ? (
          <View style={styles.emptyPreview}>
            <Text style={styles.emptyPreviewTitle}>Preview will appear here</Text>
            <Text style={styles.emptyPreviewBody}>
              Start by adding your summary, skills, and experience to generate a ready-to-export CV.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.previewName}>{name || "Your Name"}</Text>

            {(email || phone) && (
              <Text style={styles.contactText}>
                {email}
                {email && phone ? " | " : ""}
                {phone}
              </Text>
            )}

            <Text style={styles.sectionTitle}>Professional Summary</Text>
            <Text style={styles.sectionText}>
              {summary || "Professional summary will appear here."}
            </Text>

            <Text style={styles.sectionTitle}>Education</Text>
            <Text style={styles.sectionText}>{education || "Your education will appear here."}</Text>

            <Text style={styles.sectionTitle}>Skills</Text>
            {parsedSkills.length ? (
              parsedSkills.map((skill, index) => (
                <Text key={`${skill}-${index}`} style={styles.sectionText}>
                  - {skill}
                </Text>
              ))
            ) : (
              <Text style={styles.sectionText}>Your skills will appear here.</Text>
            )}

            <Text style={styles.sectionTitle}>Experience</Text>
            <Text style={styles.sectionText}>{experience || "Your experience will appear here."}</Text>
          </>
        )}
      </View>

      <TouchableOpacity activeOpacity={0.8} style={styles.exportButton} onPress={exportPDF}>
        <Text style={styles.exportText}>Download PDF</Text>
      </TouchableOpacity>
    </Animated.ScrollView>
  );
}

const createStyles = ({ COLORS, RADIUS, SPACING }: AppThemeTokens) => StyleSheet.create({
  container: {
    padding: SPACING.xxl,
    backgroundColor: COLORS.backgroundAlt,
    flexGrow: 1,
  },
  heroCard: {
    marginBottom: SPACING.xxl,
    padding: SPACING.xxl,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.black,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  eyebrow: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.9,
    textTransform: "uppercase",
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: 28,
    marginBottom: SPACING.sm,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  subtitle: {
    color: COLORS.textSecondary,
    lineHeight: 21,
    marginBottom: SPACING.lg,
  },
  heroStatsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  heroStatCard: {
    flex: 1,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  heroStatLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  heroStatValue: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  templateRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  templateButton: {
    width: "48%",
    padding: SPACING.lg,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
  },
  active: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primary,
  },
  templateLabel: {
    color: COLORS.textPrimary,
    fontWeight: "700",
    marginBottom: SPACING.xs,
  },
  templateDescription: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.card,
    color: COLORS.textPrimary,
  },
  suggestionCard: {
    marginTop: SPACING.md,
    padding: SPACING.xxl,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.black,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  suggestionTitle: {
    color: COLORS.textPrimary,
    fontWeight: "700",
    marginBottom: SPACING.md,
  },
  suggestionRow: {
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  suggestionRowTitle: {
    color: COLORS.textPrimary,
    fontWeight: "600",
    marginBottom: SPACING.xs,
  },
  suggestionRowBody: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  suggestionDone: {
    color: COLORS.success,
    fontWeight: "600",
  },
  preview: {
    marginTop: SPACING.section,
    padding: SPACING.card,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.button,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.black,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  previewName: {
    fontSize: 26,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  sectionTitle: {
    marginTop: SPACING.xxl,
    fontWeight: "700",
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  exportButton: {
    marginTop: SPACING.xxl,
    backgroundColor: COLORS.primaryLight,
    padding: SPACING.xl,
    borderRadius: RADIUS.sm,
    alignItems: "center",
  },
  contactText: {
    color: COLORS.textMuted,
    marginBottom: SPACING.md,
  },
  exportText: {
    color: COLORS.white,
    fontWeight: "700",
  },
  modernPreview: {
    borderLeftWidth: 6,
    borderLeftColor: COLORS.primary,
  },
  classicPreview: {
    borderTopWidth: 2,
    borderTopColor: COLORS.black,
  },
  minimalPreview: {
    borderLeftWidth: 0,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  executivePreview: {
    borderWidth: 1.5,
    borderColor: COLORS.textPrimary,
  },
  sectionText: {
    marginTop: SPACING.xs,
    lineHeight: 22,
    color: COLORS.textSecondary,
  },
  emptyPreview: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xxl,
  },
  emptyPreviewTitle: {
    color: COLORS.textPrimary,
    fontWeight: "700",
    marginBottom: SPACING.sm,
  },
  emptyPreviewBody: {
    color: COLORS.textMuted,
    lineHeight: 20,
  },
});
