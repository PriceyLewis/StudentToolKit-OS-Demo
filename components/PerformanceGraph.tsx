import React, { useState } from "react";
import { View, useWindowDimensions } from "react-native";
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

export default function PerformanceGraph({ data, label, width }: PerformanceGraphProps) {
  const { COLORS, RADIUS } = useTheme();
  const { width: viewportWidth } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(0);

  // React Native Web can deliver onLayout a frame after the chart first renders.
  // Use the known analytics paddings as a safe first-frame width so the graph
  // never disappears while waiting for measurement; onLayout then takes over.
  const estimatedContainerWidth = Math.max(
    1,
    width ?? viewportWidth - (viewportWidth < 390 ? 48 : 80)
  );
  const availableWidth = containerWidth > 0 ? containerWidth : estimatedContainerWidth;
  const chartWidth = Math.max(
    1,
    Math.floor(Math.min(availableWidth, width ?? availableWidth))
  );

  const labelInterval = Math.max(
    1,
    Math.ceil(data.length / Math.max(2, Math.floor(chartWidth / 70)))
  );
  const labels = data.map((d, index) =>
    index % labelInterval === 0 ? d.date.slice(5) : ""
  );
  const values = data.map((d) => d.value);

  return (
    <View
      testID="performance-graph"
      style={{ width: "100%", minHeight: 220 }}
      onLayout={({ nativeEvent }) => {
        const measuredWidth = Math.floor(nativeEvent.layout.width);
        if (measuredWidth > 0 && measuredWidth !== containerWidth) {
          setContainerWidth(measuredWidth);
        }
      }}
    >
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
