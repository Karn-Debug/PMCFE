export type User = {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "MANAGER" | "MEMBER" | "VIEWER";
  active?: boolean;
};
export type Project = {
  id: string;
  name: string;
  code: string;
  location: string;
  address: string;
  city: string;
  state: string;
  society: string;
  tower: string;
  status: string;
  stage: string;
  progress: number;
  startDate: string | null;
  targetDate: string | null;
  description: string;
  coordinators: { name: string; mobile: string }[];
  version: number;
  createdAt: string;
  updatedAt: string;
};
export type Row = {
  id: string;
  kind: string;
  title: string;
  reference?: string;
  status: string;
  priority: string;
  projectId: string | null;
  parentId: string | null;
  assigneeId: string | null;
  dueDate: string | null;
  content: string;
  data: Record<string, any>;
  amount: string;
  total: string;
  paid: string;
  version: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  project?: { name: string; id?: string; code?: string };
  assignee?: { name: string; id?: string };
  files?: { id: string; name: string; size: number; mime: string }[];
  payments?: {
    id: string;
    amount: string;
    date: string;
    reference: string;
    method: string;
  }[];
  comments?: {
    id: string;
    author: string;
    content: string;
    createdAt: string;
  }[];
};
export type Organization = {
  id: string;
  name: string;
  isDemo: boolean;
  profile: Record<string, string>;
};
export type Session = { user: User; organization: Organization };
export type Activity = {
  id: string;
  actor: string;
  action: string;
  title: string;
  entity: string;
  entityId: string;
  createdAt: string;
};
export type DashboardData = {
  projects: Project[];
  records: Row[];
  activity: Activity[];
  billed: string;
  paid: string;
  outstanding: string;
};
