export interface User {
  login: string;
  avatar_url: string;
  html_url: string;
}

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: string;
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  head: {
    ref: string;
    label: string;
  };
  base: {
    ref: string;
    label: string;
    repo: {
      full_name: string;
    };
  };
}
