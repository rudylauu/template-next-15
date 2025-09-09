#!/usr/bin/env node
import { existsSync } from "node:fs";
import { mkdir, readdir, rm, cp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";

type PackageManager = "npm" | "pnpm" | "yarn";

type Options = {
  projectName: string;
  force: boolean;
  install: boolean;
  git: boolean;
  packageManager: PackageManager;
  repo: string;
  branch: string;
};

function printHelp() {
  console.log(`Uso:
  npm create template-next-15@latest <nombre>

Opciones:
  --no-install            No instala dependencias
  --no-git                No inicializa Git
  --pm=<npm|pnpm|yarn>    Gestor de paquetes
  --force                 Sobrescribe si el directorio ya existe
  --repo=<url>            URL del repositorio GitHub del template (por defecto: https://github.com/rudylauu/template-next-15.git)
  --branch=<nombre>       Rama a usar (por defecto: main)`);
}

function parseArgs(): Options {
  const args = process.argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) {
    printHelp();
    process.exit(0);
  }
  const projectName = args[0];
  if (!projectName || projectName === ".") {
    console.error("ERROR: Debes especificar el nombre del proyecto (no se acepta '.').");
    printHelp();
    process.exit(1);
  }

  let install = true;
  let git = true;
  let packageManager: PackageManager = "npm";
  let force = false;
  let repo = "https://github.com/rudylauu/template-next-15.git";
  let branch = "main";

  for (const arg of args.slice(1)) {
    if (arg === "--no-install") install = false;
    else if (arg === "--no-git") git = false;
    else if (arg.startsWith("--pm=")) {
      const pm = arg.split("=")[1];
      if (pm === "npm" || pm === "pnpm" || pm === "yarn") packageManager = pm;
    } else if (arg === "--force") force = true;
    else if (arg.startsWith("--repo=")) repo = arg.split("=")[1];
    else if (arg.startsWith("--branch=")) branch = arg.split("=")[1];
  }

  return { projectName, force, install, git, packageManager, repo, branch };
}

async function runCommand(cmd: string, args: string[], cwd: string) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", cwd, shell: process.platform === "win32" });
    child.on("close", code => (code === 0 ? resolve() : reject(new Error(`${cmd} exited with code ${code}`))));
  });
}

async function prepareTargetDir(projectName: string, force: boolean) {
  const targetDir = path.resolve(process.cwd(), projectName);
  if (existsSync(targetDir)) {
    if (!force) {
      throw new Error(`El directorio "${projectName}" ya existe. Usa otro nombre o --force.`);
    }
    await rm(targetDir, { recursive: true, force: true });
  }
  await mkdir(targetDir, { recursive: true });
  return targetDir;
}

async function copyTemplateContents(templateRoot: string, targetDir: string) {
  const entries = await readdir(templateRoot, { withFileTypes: true });
  
  // Lista de archivos/carpetas a excluir
  const excludeList = [
    "node_modules",
    ".git", 
    ".next",
    "cli",
    "dist",
    "package-lock.json",
    ".DS_Store",
    "Thumbs.db",
    "*.log"
  ];
  
  for (const entry of entries) {
    // Verificar si el archivo/carpeta debe ser excluido
    if (excludeList.includes(entry.name)) {
      console.log(`Excluyendo: ${entry.name}`);
      continue;
    }
    
    // Verificar si es un archivo de log
    if (entry.name.endsWith('.log')) {
      console.log(`Excluyendo archivo de log: ${entry.name}`);
      continue;
    }
    
    const sourcePath = path.join(templateRoot, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    
    try {
      await cp(sourcePath, targetPath, { recursive: true });
      console.log(`Copiado: ${entry.name}`);
    } catch (error) {
      console.warn(`Error copiando ${entry.name}:`, error);
    }
  }
}

async function cloneTemplateToTemp(repo: string, branch: string): Promise<string> {
  const tmpBase = await mkdtemp(path.join(os.tmpdir(), "tmpl-"));
  console.log(`Clonando template desde ${repo} (rama: ${branch})...`);
  
  // Clone shallow
  await runCommand("git", ["clone", "--depth", "1", "--branch", branch, repo, tmpBase], process.cwd());
  
  // Detectar la estructura del repositorio clonado
  const items = await readdir(tmpBase, { withFileTypes: true });
  console.log(`Contenido del repositorio clonado:`, items.map(i => i.name));
  
  // Si hay solo una carpeta (nombre del repo), usar esa carpeta
  if (items.length === 1 && items[0].isDirectory()) {
    const repoDir = path.join(tmpBase, items[0].name);
    console.log(`Usando directorio del repositorio: ${repoDir}`);
    return repoDir;
  }
  
  // Si hay múltiples archivos/carpetas, usar el directorio raíz
  console.log(`Usando directorio raíz del clon: ${tmpBase}`);
  return tmpBase;
}

async function main() {
  const opts = parseArgs();
  const targetDir = await prepareTargetDir(opts.projectName, opts.force);

  // Obtener template desde GitHub y copiar su contenido
  const clonedPath = await cloneTemplateToTemp(opts.repo, opts.branch);
  await copyTemplateContents(clonedPath, targetDir);
  
  // Limpiar carpeta temporal
  await rm(clonedPath, { recursive: true, force: true });
  
  // Verificaciones adicionales de limpieza
  const cleanupItems = [".git", "cli", "node_modules", ".next"];
  for (const item of cleanupItems) {
    const itemPath = path.join(targetDir, item);
    if (existsSync(itemPath)) {
      console.log(`Limpiando: ${item}`);
      await rm(itemPath, { recursive: true, force: true });
    }
  }

  // Ajustar package.json name
  const pkgPath = path.join(targetDir, "package.json");
  try {
    const pkgRaw = await readFile(pkgPath, "utf8");
    const pkg = JSON.parse(pkgRaw);
    pkg.name = opts.projectName;
    await writeFile(pkgPath, JSON.stringify(pkg, null, 2));
  } catch {}

  // Git opcional
  if (opts.git) {
    try {
      await runCommand("git", ["init"], targetDir);
      await runCommand("git", ["add", "."], targetDir);
      await runCommand("git", ["commit", "-m", "Initialize from template-next-15"], targetDir);
    } catch {
      console.warn("No se pudo inicializar Git.");
    }
  }

  // Instalación opcional
  if (opts.install) {
    const pm = opts.packageManager;
    const args = pm === "yarn" ? [] : ["install"];
    try {
      await runCommand(pm, args, targetDir);
    } catch {
      console.warn("Instalación de dependencias falló. Instala manualmente.");
    }
  }

  console.log(`\n✅ Listo! Proyecto creado en: ${opts.projectName}`);
  console.log(`\nPara empezar:`);
  console.log(`  cd ${opts.projectName}`);
  if (!opts.install) {
    console.log(`  npm install`);
  }
  console.log(`  npm run dev`);
  console.log(`\nPara subir a GitHub:`);
  console.log(`  git remote add origin <tu-repo-url>`);
  console.log(`  git push -u origin main`);
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
