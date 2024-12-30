import React from "react";
import { Link } from "react-router-dom";

function Introduction() {
  return (
    <div className="overlay">
      <div className="overlay-content">
        <h1 className="ubuntu-bold-italic">No More Lost Documents</h1>
        <p className="ubuntu-light">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. <br />
          Suspendisse vulputate suscipit lacus non pulvinar. <br />
          Phasellus eget leo et nulla tristique interdum.
        </p>
        <h3 className="ubuntu-regular">
          <Link className="ubuntu-regular-italic" to="/register" style={{ textDecoration: "underline", color: "inherit" }}>
            Learn More
          </Link>
        </h3>
      </div>
    </div>
  );
}

export default Introduction;