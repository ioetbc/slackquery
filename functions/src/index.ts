import {initializeApp} from "firebase-admin/app";
import {save} from "./save";
import {home} from "./home";
import {shit} from "./app";
import {logic} from "./logic";

initializeApp();

export {home, save, shit, logic};
