import { Redirect } from "@docusaurus/router"
import React from "react"

import { JSX } from "react/jsx-runtime"

export default function Home(): JSX.Element {
  return <Redirect to="/project-overview" />
}
