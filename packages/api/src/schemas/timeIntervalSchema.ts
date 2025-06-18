export default {
  type: "object",
  required: ["start"],
  properties: {
    start: {
      type: "string",
      format: "date",
    },
    end: {
      type: "string",
      format: "date",
    },
  },
} as const;
