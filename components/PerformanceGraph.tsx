import React from "react";
import { View } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { useTheme } from "../context/theme";

type Point = {
  date: string;
  value: number;
};

type PerformanceGraphProps = {
  data: Point[];
  label: string;
  width?: number;
};

export default function PerformanceGraph({ data, label, width = 320 }: PerformanceGraphProps) {
  const { COLORS, RADIUS } = useTheme();
  const labels = data.map((d) => d.date.slice(5));
  const values = data.map((d) => d.value);
  const chartWidth = Math.max(220, width);

  return (
    <View>
      <LineChart
        data={{
          labels,
          datasets: [
            {
              data: values.length ? values : [0],
            },
          ],
          legend: [label],
        }}
        width={chartWidth}
        height={220}
        yAxisSuffix=""
        chartConfig={{
          backgroundGradientFrom: COLORS.card,
          backgroundGradientTo: COLORS.card,
          color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(75, 85, 99, ${opacity})`,
          decimalPlaces: 0,
          propsForDots: {
            r: "3",
            strokeWidth: "1",
            stroke: COLORS.primary,
            fill: COLORS.white,
          },
          propsForBackgroundLines: {
            stroke: COLORS.border,
          },
          propsForLabels: {
            fontSize: 11,
          },
        }}
        bezier
        style={{
          borderRadius: RADIUS.card,
        }}
        withInnerLines
        withOuterLines={false}
        withVerticalLines={false}
        fromZero
      />
    </View>
  );
}
