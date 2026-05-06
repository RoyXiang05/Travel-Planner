import LZString from "lz-string";

export const serializeState = (data: any) => {
  try {
    const json = JSON.stringify(data);
    return LZString.compressToEncodedURIComponent(json);
  } catch (e) {
    console.error("Serialization failed", e);
    return "";
  }
};

export const deserializeState = (compressed: string) => {
  try {
    const json = LZString.decompressFromEncodedURIComponent(compressed);
    if (!json) return null;
    return JSON.parse(json);
  } catch (e) {
    console.error("Deserialization failed", e);
    return null;
  }
};
