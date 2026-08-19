const AdmZip = require("adm-zip");
const path = require("path");
const zip = new AdmZip(path.resolve("..", "Dummy Data Generated Resumes.pptx"));
const pres = zip.getEntry("ppt/presentation.xml").getData().toString("utf8");
const rels = zip.getEntry("ppt/_rels/presentation.xml.rels").getData().toString("utf8");
const m = pres.match(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/);
console.log(m ? m[0] : "no sldIdLst");
console.log("\n--- rels ---\n");
console.log(rels);
