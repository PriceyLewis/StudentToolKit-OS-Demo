import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useContext, useMemo, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { PerformanceContext } from "../context/PerformanceContext";
import { useThemedStyles, type AppThemeTokens } from "../context/theme";

type DeadlineField = "academic" | "fitness" | "hustle" | "career";

const parseDateKey = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
};

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function Targets() {
  const styles = useThemedStyles(createStyles);
  const {
    academicTarget,
    fitnessTarget,
    hustleTarget,
    careerTarget,
    academicDeadline,
    fitnessDeadline,
    hustleDeadline,
    careerDeadline,
    setAcademicTarget,
    setFitnessTarget,
    setHustleTarget,
    setCareerTarget,
    setAcademicDeadline,
    setFitnessDeadline,
    setHustleDeadline,
    setCareerDeadline,
  } = useContext(PerformanceContext);

  const [pickerField, setPickerField] = useState<DeadlineField | null>(null);
  const [pickerDate, setPickerDate] = useState(new Date());

  const deadlineMap = useMemo(
    () => ({
      academic: { value: academicDeadline, setValue: setAcademicDeadline, label: "Academic" },
      fitness: { value: fitnessDeadline, setValue: setFitnessDeadline, label: "Fitness" },
      hustle: { value: hustleDeadline, setValue: setHustleDeadline, label: "Hustle" },
      career: { value: careerDeadline, setValue: setCareerDeadline, label: "Career" },
    }),
    [
      academicDeadline,
      fitnessDeadline,
      hustleDeadline,
      careerDeadline,
      setAcademicDeadline,
      setFitnessDeadline,
      setHustleDeadline,
      setCareerDeadline,
    ]
  );

  const openPicker = (field: DeadlineField) => {
    const existing = parseDateKey(deadlineMap[field].value);
    setPickerDate(existing ?? new Date());
    setPickerField(field);
  };

  const onChangeDate = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === "dismissed") {
      setPickerField(null);
      return;
    }
    if (!selectedDate || !pickerField) {
      setPickerField(null);
      return;
    }

    deadlineMap[pickerField].setValue(toDateKey(selectedDate));
    if (Platform.OS !== "ios") {
      setPickerField(null);
    } else {
      setPickerDate(selectedDate);
    }
  };

  const renderDeadlineControl = (field: DeadlineField) => {
    const item = deadlineMap[field];
    const valid = item.value ? !!parseDateKey(item.value) : true;
    return (
      <View style={styles.deadlineBlock}>
        <Text style={styles.helper}>{item.label} Deadline</Text>
        <View style={styles.deadlineRow}>
          <TouchableOpacity activeOpacity={0.85} style={styles.dateButton} onPress={() => openPicker(field)}>
            <Text style={styles.dateButtonText}>{item.value || "Pick date"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.clearDateButton}
            onPress={() => item.setValue("")}
          >
            <Text style={styles.clearDateButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
        {!valid ? <Text style={styles.validationText}>Invalid date. Use the picker to correct it.</Text> : null}
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Performance Targets</Text>

      <Text style={styles.label}>Target Academic Performance Hours / Week</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={academicTarget.toString()}
        onChangeText={(v) => setAcademicTarget(parseInt(v, 10) || 0)}
      />
      {renderDeadlineControl("academic")}

      <Text style={styles.label}>Target Physical Conditioning Days / Week</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={fitnessTarget.toString()}
        onChangeText={(v) => setFitnessTarget(parseInt(v, 10) || 0)}
      />
      {renderDeadlineControl("fitness")}

      <Text style={styles.label}>Target Income Development Hours / Week</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={hustleTarget.toString()}
        onChangeText={(v) => setHustleTarget(parseInt(v, 10) || 0)}
      />
      {renderDeadlineControl("hustle")}

      <Text style={styles.label}>Target Professional Profile Score</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={careerTarget.toString()}
        onChangeText={(v) => setCareerTarget(parseInt(v, 10) || 0)}
      />
      {renderDeadlineControl("career")}

      {pickerField ? (
        <View style={styles.pickerWrap}>
          <DateTimePicker
            value={pickerDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onChangeDate}
          />
          {Platform.OS === "ios" ? (
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.donePickerButton}
              onPress={() => setPickerField(null)}
            >
              <Text style={styles.donePickerButtonText}>Done</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

const createStyles = ({ COLORS, RADIUS, SPACING }: AppThemeTokens) =>
  StyleSheet.create({
    container: {
      padding: SPACING.xxl,
      backgroundColor: COLORS.backgroundAlt,
      flexGrow: 1,
    },
    title: {
      fontSize: 24,
      fontWeight: "700",
      marginBottom: SPACING.xxl,
      color: COLORS.textPrimary,
    },
    label: {
      color: COLORS.textPrimary,
      fontWeight: "600",
      marginBottom: SPACING.xs,
    },
    input: {
      backgroundColor: COLORS.card,
      color: COLORS.textPrimary,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: SPACING.lg,
      borderRadius: RADIUS.button,
      marginBottom: SPACING.sm,
    },
    helper: {
      color: COLORS.textMuted,
      marginBottom: SPACING.xs,
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    deadlineBlock: {
      marginBottom: SPACING.xl,
    },
    deadlineRow: {
      flexDirection: "row",
      gap: SPACING.sm,
      alignItems: "center",
    },
    dateButton: {
      flex: 1,
      backgroundColor: COLORS.card,
      borderColor: COLORS.border,
      borderWidth: 1,
      borderRadius: RADIUS.button,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.lg,
    },
    dateButtonText: {
      color: COLORS.textPrimary,
      fontWeight: "600",
    },
    clearDateButton: {
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.danger,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      backgroundColor: COLORS.card,
    },
    clearDateButtonText: {
      color: COLORS.danger,
      fontWeight: "700",
      fontSize: 12,
    },
    validationText: {
      marginTop: SPACING.xs,
      color: COLORS.dangerText,
      fontSize: 12,
    },
    pickerWrap: {
      marginTop: SPACING.md,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: RADIUS.card,
      backgroundColor: COLORS.card,
      padding: SPACING.sm,
    },
    donePickerButton: {
      marginTop: SPACING.sm,
      alignSelf: "flex-end",
      borderRadius: RADIUS.md,
      backgroundColor: COLORS.primary,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.sm,
    },
    donePickerButtonText: {
      color: COLORS.white,
      fontWeight: "700",
    },
  });

