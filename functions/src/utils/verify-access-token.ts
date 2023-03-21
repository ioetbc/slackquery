import axios from "axios";

export const verifyAccessToken = async (accessToken: string) => {
  console.log("accessToken ib verifyAccessToken", accessToken);
  const response = await axios.get("https://slack.com/api/auth.test", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const {data} = response;

  console.log("data", data);

  if (data && data.ok) {
    return data.team_id;
  } else {
    throw new Error("Invalid access token");
  }
};
