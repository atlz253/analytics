import { JSONFilePreset } from "lowdb/node";

interface DataBase {
  monolith: {
    isTerraformInitialized: boolean;
  };
  serverlessMonolith: {
    isTerraformInitialized: boolean;
  };
  ssh: {
    key: string;
    user: string;
  };
}

const defaultData = {
  monolith: { isTerraformInitialized: false },
  serverlessMonolith: { isTerraformInitialized: false },
  ssh: {
    key: "",
    user: "",
  },
} satisfies DataBase;

export const db = await JSONFilePreset<DataBase>("db.json", defaultData);
