import {getFirestore} from "firebase-admin/firestore";

export const getAccessToken = async (teamId: string) => {
  const firestore = getFirestore();
  const doc = await firestore.collection("teams").doc(teamId).get();
  console.log("doc", doc);
  if (doc.exists) {
    return doc.data()?.ACCESS_TOKEN;
  } else {
    throw new Error("Team not found");
  }
};
