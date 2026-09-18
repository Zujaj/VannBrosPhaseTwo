#!/usr/bin/env tsx

import { chromium, Page } from "playwright"
import { readFileSync, existsSync, unlinkSync, writeFileSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"
import { tmpdir } from "os"
import { flattenSidebar, FlattenedItem } from "./sidebar-utils"
import PDFMerger from "pdf-merger-js"
import {
  PDFDocument,
  StandardFonts,
  rgb,
  PDFName,
  PDFString,
  PDFArray,
  PDFDict
} from "pdf-lib"

/**
 * Direct import of sidebars configuration.
 * tsx allows us to import .ts files directly in Node.js.
 */
// @ts-ignore
import sidebarsConfig from "../sidebars"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const BASE_URL = "http://localhost:3000"
const OUTPUT_PATH = join(__dirname, "..", "vannbrosphasetwo-documentation.pdf")
const HYDRATION_DELAY = 1000
const MAX_CONCURRENCY = 5 // Process 5 pages at a time for speed

const PDF_THEME = {
  brandPrimary: "#02B553",
  brandAccent: "#02B553",
  brandHighlight: "#E0E000",
  text: "#333333",
  title: "#02B553",
  textMuted: "#4b5563",
  textSubtle: "#9ca3af",
  borderLight: "#f3f4f6"
} as const

/**
 * Get dynamic copyright text
 */
function getCopyrightText(): string {
  const year = new Date().getFullYear()
  return `© 2026 - ${year} VannBrosPhaseTwo. All rights reserved.`
}

/**
 * Ensures the page is fully interactive and all assets (images, Mermaid) are rendered
 */
async function waitForContentToLoad(page: Page): Promise<void> {
  const url = page.url()
  try {
    await page.waitForSelector("article", { timeout: 10000 })
  } catch (e) {
    console.warn(`  ⚠️  Warning: <article> selector not found on ${url}. Proceeding...`)
    return
  }

  try {
    // Wait for images to load, but don't block the entire process if some are broken
    await page.waitForFunction(
      () => {
        const imgElements = Array.from(document.querySelectorAll("article img"))
        return imgElements.every((img) => (img as HTMLImageElement).complete)
      },
      { timeout: 15000 }
    )
  } catch (e) {
    console.warn(`  ⚠️  Warning: Some images failed to load on ${url} within timeout.`)
  }

  const hasMermaid = await page.evaluate(
    () => !!document.querySelector(".mermaid")
  )
  if (hasMermaid) {
    // Give extra time for mermaid diagrams to render
    await new Promise(resolve => setTimeout(resolve, 3000))
  }
  await new Promise(resolve => setTimeout(resolve, HYDRATION_DELAY))
}

/**
 * Injects professional print styles directly into the DOM
 */
async function injectPrintStyles(page: Page): Promise<void> {
  const cssPath = join(__dirname, "..", "src", "css", "print.css")
  const cssContent = readFileSync(cssPath, "utf-8")
  await page.addStyleTag({ content: cssContent })
}

/**
 * Generate a professional title page with the logo centered
 */
/**
 * Generate a professional title page with the logo centered
 */
async function generateTitlePage(
  page: Page,
  outputPath: string
): Promise<void> {
  console.log("Generating Title Page...")

  // Read resources
  const logoPath = join(__dirname, "..", "static", "logo.svg")
  const logoBase64 = readFileSync(logoPath).toString("base64")

  // Get Metadata
  let version = "1.0.0"
  try {
    const packageJson = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf8"))
    version = packageJson.version || "1.0.0"
  } catch (e) { console.warn("Could not read package.json version") }

  const date = new Date().toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' })

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap');
            
            body, html { 
                margin: 0; 
                padding: 0; 
                height: 100%; 
                background: white; 
                font-family: 'Inter', sans-serif;
                color: ${PDF_THEME.text};
            }

            .page-container {
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                height: 100vh;
                padding: 60px 80px;
                box-sizing: border-box;
                border-top: 12px solid ${PDF_THEME.brandPrimary};
                position: relative;
                overflow: hidden;
            }

            .bg-deco {
                position: absolute;
                bottom: -20%;
                right: -10%;
                width: 70%;
                height: 60%;
                background: radial-gradient(circle, rgba(11, 65, 31, 0.05) 0%, transparent 70%);
                z-index: 0;
            }

            .header {
                text-align: right;
                font-size: 14px;
                color: ${PDF_THEME.brandPrimary};
                font-weight: 700;
                letter-spacing: 0.1em;
                text-transform: uppercase;
                z-index: 1;
            }

            .main-content {
                flex-grow: 1;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: flex-start;
                z-index: 1;
                padding-bottom: 40px;
            }

            .logo {
                height: 60px;
                width: auto;
                margin-bottom: 50px;
                display: block;
            }

            h1 {
                font-size: 64px;
                font-weight: 800;
                line-height: 1.05;
                margin: 0 0 24px 0;
                color: ${PDF_THEME.title};
                letter-spacing: -0.03em;
            }
            
            h1 span {
                color: ${PDF_THEME.brandHighlight};
            }

            .subtitle {
                font-size: 24px;
                color: ${PDF_THEME.textMuted};
                font-weight: 300;
                margin: 0 0 50px 0;
                max-width: 600px;
                line-height: 1.5;
                border-left: 4px solid ${PDF_THEME.brandHighlight};
                padding-left: 20px;
            }

            .meta-grid {
                display: grid;
                grid-template-columns: auto auto;
                gap: 60px;
                padding-top: 40px;
                border-top: 2px solid ${PDF_THEME.borderLight};
                width: 100%;
                max-width: 500px;
            }

            .meta-item label {
                display: block;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.1em;
                color: ${PDF_THEME.brandPrimary};
                font-weight: 700;
                margin-bottom: 8px;
            }

            .meta-item span {
                font-size: 18px;
                color: #1f2937;
                font-weight: 600;
                font-feature-settings: "tnum";
            }

            .footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 13px;
                color: ${PDF_THEME.textSubtle};
                padding-top: 20px;
                border-top: 1px solid transparent; /* Spacer */
                z-index: 1;
            }

            .brand-link {
                color: ${PDF_THEME.brandAccent};
                text-decoration: none;
                font-weight: 600;
            }
        </style>
    </head>
    <body>
        <div class="page-container">
            <div class="bg-deco"></div>
            
            <div class="header">
                Internal Resources
            </div>
            
            <div class="main-content">
                <img class="logo" src="data:image/svg+xml;base64,${logoBase64}" />
                
                <h1>Technical<br/><span>Documentation</span></h1>
                
                <p class="subtitle">
                    A brief overview of VannBrosPhaseTwo's architecture, project flows, and key features.
                </p>
                
                <div class="meta-grid">
                    <div class="meta-item">
                        <label>Version</label>
                        <span>${version}</span>
                    </div>
                    <div class="meta-item">
                        <label>Last Updated</label>
                        <span>${date}</span>
                    </div>
                </div>
            </div>

            <div class="footer">
                <div>${getCopyrightText()}</div>
            </div>
        </div>
    </body>
    </html>
    `
  await page.setContent(html)
  await page.pdf({
    path: outputPath,
    format: "A4",
    printBackground: true
  })
}

/**
 * Generate a beautifully centered section separator page for categories
 */
async function generateCategoryPage(
  page: Page,
  label: string,
  outputPath: string
): Promise<void> {
  console.log(`Generating Divider Page: "${label}"...`)
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&display=swap');
            body, html { margin: 0; padding: 0; height: 100%; display: flex; align-items: center; justify-content: center; background: white; font-family: 'Inter', sans-serif; }
            .container { text-align: center; }
            .divider { width: 60px; height: 4px; background: ${PDF_THEME.brandHighlight}; margin: 0 auto 32px; border-radius: 2px; }
            h1 { font-size: 42px; font-weight: 800; color: ${PDF_THEME.brandPrimary}; margin: 0; letter-spacing: -0.02em; }
            p { font-size: 14px; text-transform: uppercase; letter-spacing: 0.2em; color: ${PDF_THEME.textSubtle}; font-weight: 600; margin-bottom: 24px; }
        </style>
    </head>
    <body>
        <div class="container">
            <p>Section Start</p>
            <div class="divider"></div>
            <h1>${label}</h1>
        </div>
    </body>
    </html>
    `
  await page.setContent(html)
  await page.pdf({
    path: outputPath,
    format: "A4",
    printBackground: true
  })
}

/**
 * Generate TOC Page with hierarchical categories and relative page numbers
 */
async function generateTOCPage(
  page: Page,
  allItems: (FlattenedItem & { pageNum?: number })[],
  outputPath: string
): Promise<void> {
  console.log("Generating Table of Contents...")
  const tocHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&display=swap');
            body, html { margin: 0; padding: 0; background: white; font-family: "Inter", sans-serif; color: ${PDF_THEME.text}; }
            body { padding: 50px 60px; box-sizing: border-box; }
            h1 { font-size: 34px; font-weight: 800; margin-bottom: 30px; text-align: center; }
            .toc-list { list-style: none; padding: 0; margin: 0; }
            .toc-item { 
                display: flex; 
                justify-content: space-between; 
                align-items: baseline; 
                margin-bottom: 10px; 
                font-size: 15px;
                page-break-inside: avoid;
            }
            .toc-link { color: ${PDF_THEME.brandAccent}; text-decoration: none; font-weight: 600; }
            .toc-dots { flex-grow: 1; border-bottom: 1px dotted #ccc; margin: 0 10px; }
            .toc-page { color: #666; font-variant-numeric: tabular-nums; width: 35px; text-align: right; }
            
            .category-item { font-weight: 800; color: ${PDF_THEME.brandPrimary}; font-size: 15px; margin-top: 25px; margin-bottom: 8px; }
            .category-item .toc-link { font-weight: 800; color: ${PDF_THEME.brandPrimary}; }
            .level-0 { padding-left: 0; }
            .level-1 { padding-left: 20px; }
            .level-2 { padding-left: 40px; }
            .level-3 { padding-left: 60px; }
        </style>
    </head>
    <body>
        <h1>Table of Contents</h1>
        <ul class="toc-list">
            ${allItems
      .map((item) => {
        const pageNum = item.pageNum || 0
        if (item.type === "category") {
          return `
                    <li class="toc-item category-item level-${item.level}">
                        <a href="${BASE_URL}/category/${encodeURIComponent(item.label)}" class="toc-link">${item.label}</a>
                        <span class="toc-dots"></span>
                        <span class="toc-page">${pageNum}</span>
                    </li>`
        }
        return `
                    <li class="toc-item doc-item level-${item.level}">
                        <a href="${BASE_URL}${item.path}" class="toc-link">${item.label}</a>
                        <span class="toc-dots"></span>
                        <span class="toc-page">${pageNum}</span>
                    </li>
                `
      })
      .join("")}
        </ul>
    </body>
    </html>
    `
  await page.setContent(tocHtml)
  await page.pdf({
    path: outputPath,
    format: "A4",
    printBackground: true,
    margin: { top: "25mm", bottom: "25mm", left: "25mm", right: "25mm" }
  })
}

/**
 * Post-processes the PDF to add page numbers and jump-links
 */
async function postProcessPDF(
  pdfPath: string,
  titlePageCount: number,
  tocPageCount: number,
  docMappings: { path: string; pageNum: number }[]
): Promise<void> {
  console.log(`Finalizing PDF (Internal links + Global numbering)...`)
  const pdfBytes = readFileSync(pdfPath)
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const normalFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const pages = pdfDoc.getPages()
  const totalPages = pages.length

  const preContentPageCount = titlePageCount + tocPageCount
  const contentPageCount = totalPages - preContentPageCount

  // Map paths to target PDF page indices
  const pathMap = new Map<string, number>()
  docMappings.forEach((m) =>
    pathMap.set(m.path, m.pageNum + preContentPageCount - 1)
  )

  for (let i = 0; i < totalPages; i++) {
    const page = pages[i]
    const { width } = page.getSize()

    // 1. Convert external documentation links to internal GoTo actions (Global scan)
    const annots = (page.node as any).get(PDFName.of("Annots"))
    if (annots instanceof PDFArray) {
      for (let j = 0; j < annots.size(); j++) {
        const annot = pdfDoc.context.lookup(annots.get(j)) as PDFDict
        if (annot && annot.get(PDFName.of("Subtype")) === PDFName.of("Link")) {
          const action = annot.get(PDFName.of("A")) as PDFDict
          if (action && action.get(PDFName.of("S")) === PDFName.of("URI")) {
            const uriValue = (
              action.get(PDFName.of("URI")) as PDFString
            ).asString()

            // Clean the URI for matching (remove trailing slash or anchors)
            const cleanUri = uriValue.replace(/\/$/, "").split("#")[0]

            // Handle Home/TOC link (Home icon in breadcrumbs usually points to /)
            if (cleanUri === BASE_URL || cleanUri === "" || cleanUri === "/") {
              annot.set(
                PDFName.of("A"),
                pdfDoc.context.obj({
                  Type: "Action",
                  S: "GoTo",
                  D: [pages[titlePageCount].ref, "Fit"]
                })
              )
              continue
            }

            for (const [docPath, targetIndex] of pathMap.entries()) {
              // Match if the link ends with the doc path
              if (cleanUri.endsWith(docPath.replace(/\/$/, ""))) {
                annot.set(
                  PDFName.of("A"),
                  pdfDoc.context.obj({
                    Type: "Action",
                    S: "GoTo",
                    D: [pages[targetIndex].ref, "Fit"]
                  })
                )
                break
              }
            }
          }
        }
      }
    }

    // 2. Global Page Numbering for content only
    if (i >= preContentPageCount) {
      const relativePageNum = i - preContentPageCount + 1
      page.drawLine({
        start: { x: 50, y: 50 },
        end: { x: width - 50, y: 50 },
        thickness: 0.5,
        color: rgb(0.9, 0.9, 0.9)
      })
      const pageText = `Page ${relativePageNum} of ${contentPageCount}`
      const textWidth = normalFont.widthOfTextAtSize(pageText, 8)
      page.drawText(pageText, {
        x: width - 50 - textWidth,
        y: 35,
        size: 8,
        font: normalFont,
        color: rgb(0.6, 0.6, 0.6)
      })
    }
  }

  writeFileSync(pdfPath, await pdfDoc.save())
}

async function main(): Promise<void> {
  console.log("🚀 Starting Optimized Master PDF Generation...")
  const allItems = flattenSidebar(sidebarsConfig)
  const systemTemp = tmpdir()

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-web-security"
    ],
    channel: "msedge"
  })

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2
  })

  // Records keep their order because we pre-allocate and use indices
  const tempPdfRecords: {
    path: string
    pageCount: number
    item: FlattenedItem
  }[] = new Array(allItems.length)

  try {
    console.log(
      `Phase 1: Measuring ${allItems.length} components in parallel (Concurrency: ${MAX_CONCURRENCY})...`
    )

    // Process in chunks to maintain concurrency limit
    for (let i = 0; i < allItems.length; i += MAX_CONCURRENCY) {
      const chunk = allItems.slice(i, i + MAX_CONCURRENCY)
      console.log(
        `Processing batch ${Math.floor(i / MAX_CONCURRENCY) + 1}/${Math.ceil(allItems.length / MAX_CONCURRENCY)}...`
      )

      await Promise.all(
        chunk.map(async (item, index) => {
          const globalIndex = i + index
          const page = await context.newPage()
          try {
            const tempPath = join(
              systemTemp,
              `project-pdf-measure-${globalIndex}.pdf`
            )

            if (item.type === "category") {
              await generateCategoryPage(page, item.label, tempPath)
            } else {
              console.log(`📄 Generating Page: "${item.label}" (${item.path})...`)
              await page.goto(`${BASE_URL}${item.path}`, {
                waitUntil: "networkidle"
              })
              await waitForContentToLoad(page)
              await injectPrintStyles(page)
              await page.pdf({
                path: tempPath,
                format: "A4",
                printBackground: true,
                margin: {
                  top: "25mm",
                  bottom: "25mm",
                  left: "15mm",
                  right: "15mm"
                }
              })
            }

            const doc = await PDFDocument.load(readFileSync(tempPath))
            tempPdfRecords[globalIndex] = {
              path: tempPath,
              pageCount: doc.getPageCount(),
              item
            }
          } finally {
            await page.close()
          }
        })
      )
    }

    // Step 2: Generate Title & TOC
    const titlePage = await context.newPage()
    const titlePath = join(systemTemp, "project-pdf-title.pdf")
    await generateTitlePage(titlePage, titlePath)
    const titleDoc = await PDFDocument.load(readFileSync(titlePath))
    const titlePageCount = titleDoc.getPageCount()
    await titlePage.close()

    let currentPageOffset = 1
    const docMappings = tempPdfRecords.map((r) => {
      const pnum = currentPageOffset
      currentPageOffset += r.pageCount
      // For categories, provide a synthetic path so internal links can map to it
      const mappingPath =
        r.item.type === "category"
          ? `/category/${encodeURIComponent(r.item.label)}`
          : r.item.path
      return { path: mappingPath, pageNum: pnum }
    })

    const tocItems = allItems.map((item, idx) => {
      return { ...item, pageNum: docMappings[idx].pageNum }
    })

    const tocPage = await context.newPage()
    const tocPath = join(systemTemp, "project-pdf-toc.pdf")
    await generateTOCPage(tocPage, tocItems, tocPath)
    const tocDoc = await PDFDocument.load(readFileSync(tocPath))
    const tocPageCount = tocDoc.getPageCount()
    await tocPage.close()

    console.log(`Phase 2: Merging components...`)
    const merger = new PDFMerger()
    await merger.add(titlePath)
    await merger.add(tocPath)
    for (const record of tempPdfRecords) await merger.add(record.path)
    await merger.save(OUTPUT_PATH)

    // Step 4: Finalize numbering and links
    await postProcessPDF(OUTPUT_PATH, titlePageCount, tocPageCount, docMappings)

    console.log(`\n✅ PDF Successfully Generated: ${OUTPUT_PATH}`)
  } catch (e) {
    console.error("Operation failed:", e)
  } finally {
    await browser.close()

    // Cleanup system temps
    const cleanupFiles = [
      join(systemTemp, "project-pdf-title.pdf"),
      join(systemTemp, "project-pdf-toc.pdf"),
      ...tempPdfRecords.map((r) => r?.path).filter(Boolean)
    ]

    cleanupFiles.forEach((file) => {
      if (existsSync(file)) unlinkSync(file)
    })
  }
}

main()
