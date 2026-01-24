import { useCssElement } from "react-native-css";
import React from "react";
import { Image as RNImage } from "react-native";

export type ImageProps = React.ComponentProps<typeof RNImage>;

export const Image = (
  props: any & { className?: string }
) => {
  return useCssElement(RNImage, props, { className: "style" });
};

Image.displayName = "CSS(Image)";
