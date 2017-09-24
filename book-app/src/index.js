import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import registerServiceWorker from "./registerServiceWorker";
import queryString from "query-string";

import "ubi-bootstrap/dist/css/bootstrap.css";
import "ubi-bootstrap/dist/css/theme.css";
import "./index.css";

let params = queryString.parse(window.location.search);
let pairId = params["pairId"];

ReactDOM.render(<App bookId={pairId} />, document.getElementById("root"));
registerServiceWorker();
