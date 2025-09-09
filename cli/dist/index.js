#!/usr/bin/env node
import { existsSync } from "node:fs";
import { mkdir, readdir, rm, cp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
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
function parseArgs() {
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
    let packageManager = "npm";
    let force = false;
    let repo = "https://github.com/rudylauu/template-next-15.git";
    let branch = "main";
    for (const arg of args.slice(1)) {
        if (arg === "--no-install")
            install = false;
        else if (arg === "--no-git")
            git = false;
        else if (arg.startsWith("--pm=")) {
            const pm = arg.split("=")[1];
            if (pm === "npm" || pm === "pnpm" || pm === "yarn")
                packageManager = pm;
        }
        else if (arg === "--force")
            force = true;
        else if (arg.startsWith("--repo="))
            repo = arg.split("=")[1];
        else if (arg.startsWith("--branch="))
            branch = arg.split("=")[1];
    }
    return { projectName, force, install, git, packageManager, repo, branch };
}
async function runCommand(cmd, args, cwd) {
    await new Promise((resolve, reject) => {
        const child = spawn(cmd, args, { stdio: "inherit", cwd, shell: process.platform === "win32" });
        child.on("close", code => (code === 0 ? resolve() : reject(new Error(`${cmd} exited with code ${code}`))));
    });
}
async function prepareTargetDir(projectName, force) {
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
async function copyTemplateContents(templateRoot, targetDir) {
    const entries = await readdir(templateRoot, { withFileTypes: true });
    for (const entry of entries) {
        // Excluir archivos/carpetas que no queremos copiar
        if (entry.name === "node_modules" ||
            entry.name === ".git" ||
            entry.name === ".next" ||
            entry.name === "cli" ||
            entry.name === "dist" ||
            entry.name === "package-lock.json") {
            continue;
        }
        await cp(path.join(templateRoot, entry.name), path.join(targetDir, entry.name), { recursive: true });
    }
}
async function cloneTemplateToTemp(repo, branch) {
    const tmpBase = await mkdtemp(path.join(os.tmpdir(), "tmpl-"));
    console.log(`Clonando template desde ${repo} (rama: ${branch})...`);
    // Clone shallow
    await runCommand("git", ["clone", "--depth", "1", "--branch", branch, repo, tmpBase], process.cwd());
    // Si el clone coloca contenido en una subcarpeta (nombre del repo), detectar y retornar esa ruta
    const items = await readdir(tmpBase, { withFileTypes: true });
    if (items.length === 1 && items[0].isDirectory()) {
        // Algunos proveedores git clonan en tmpBase directamente; si no, manejar directorio anidado
        const maybeNested = path.join(tmpBase, items[0].name);
        try {
            const nestedItems = await readdir(maybeNested);
            if (nestedItems.length >= 0)
                return maybeNested;
        }
        catch { }
    }
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
    // Borrar carpeta .git si quedó dentro del target por alguna razón (defensa adicional)
    const gitDir = path.join(targetDir, ".git");
    if (existsSync(gitDir))
        await rm(gitDir, { recursive: true, force: true });
    // Ajustar package.json name
    const pkgPath = path.join(targetDir, "package.json");
    try {
        const pkgRaw = await readFile(pkgPath, "utf8");
        const pkg = JSON.parse(pkgRaw);
        pkg.name = opts.projectName;
        await writeFile(pkgPath, JSON.stringify(pkg, null, 2));
    }
    catch { }
    // Git opcional
    if (opts.git) {
        try {
            await runCommand("git", ["init"], targetDir);
            await runCommand("git", ["add", "."], targetDir);
            await runCommand("git", ["commit", "-m", "Initialize from template-next-15"], targetDir);
        }
        catch {
            console.warn("No se pudo inicializar Git.");
        }
    }
    // Instalación opcional
    if (opts.install) {
        const pm = opts.packageManager;
        const args = pm === "yarn" ? [] : ["install"];
        try {
            await runCommand(pm, args, targetDir);
        }
        catch {
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
