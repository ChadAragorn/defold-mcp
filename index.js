#!/usr/bin/env node

require('dotenv').config();
console.error('Loaded dotenv');

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { 
  CallToolRequestSchema, 
  ListToolsRequestSchema 
} = require('@modelcontextprotocol/sdk/types.js');

const { exec, execSync, spawn } = require('child_process');
console.error('Imported child_process');
const fs = require('fs').promises;
console.error('Imported fs');
const path = require('path');
console.error('Imported path');
const ini = require('ini');
console.error('Imported ini');
const yaml = require('js-yaml');
console.error('Imported js-yaml');
const chokidar = require('chokidar');
console.error('Imported chokidar');
const { Writable } = require('stream');
console.error('Imported stream');
const os = require('os');
console.error('Imported os');
const { https } = require('follow-redirects');
console.error('Imported follow-redirects');

process.stdout.setMaxListeners(0);
process.stdout.write('');
console.error('Forced unbuffered stdout');

const MCP_PORT = process.env.MCP_PORT || 3000;
console.error(`MCP_PORT: ${MCP_PORT}`);
const MCP_HOST = process.env.MCP_HOST || 'localhost';
console.error(`MCP_HOST: ${MCP_HOST}`);
const MCP_TRANSPORT = process.env.MCP_TRANSPORT || 'stdio';
console.error(`MCP_TRANSPORT: ${MCP_TRANSPORT}`);

// Server configuration
const SERVER_INFO = {
  name: 'defold-mcp',
  version: '1.2.7',
  description: 'Complete MCP server for Defold game engine with Dotenv and Apple Silicon support'
};

// Define the tools the server provides
const TOOLS = [
  {
    name: 'launch_defold',
    description: 'Launch Defold editor for a project',
    parameters: {
      projectPath: { type: 'string', description: 'Path to Defold project directory' }
    }
  },
  {
    name: 'run_project',
    description: 'Run Defold project in debug mode and capture console output',
    parameters: {
      projectPath: { type: 'string', description: 'Path to Defold project directory' }
    }
  },
  {
    name: 'create_project',
    description: 'Create a new Defold project with basic structure',
    parameters: {
      projectPath: { type: 'string', description: 'Path for new project directory' },
      projectName: { type: 'string', description: 'Name of the project' }
    }
  },
  {
    name: 'list_projects',
    description: 'List all Defold projects in a directory',
    parameters: {
      directory: { type: 'string', description: 'Directory to search for Defold projects' }
    }
  },
  {
    name: 'get_project_settings',
    description: 'Read settings from game.project file',
    parameters: {
      projectPath: { type: 'string', description: 'Path to Defold project directory' }
    }
  },
  {
    name: 'update_project_settings',
    description: 'Update settings in game.project file',
    parameters: {
      projectPath: { type: 'string', description: 'Path to Defold project directory' },
      settings: { type: 'object', description: 'Key-value pairs to update (e.g., { project: { title: "New Title" } })' }
    }
  },
  {
    name: 'create_script',
    description: 'Create a new Lua script in the Defold project',
    parameters: {
      projectPath: { type: 'string', description: 'Path to Defold project directory' },
      scriptName: { type: 'string', description: 'Name of the script (without .lua)' },
      scriptType: { type: 'string', description: 'Type: script, gui_script, render_script', default: 'script' },
      content: { type: 'string', description: 'Script content', default: '-- Lua script created by Defold MCP\n' }
    }
  },
  {
    name: 'edit_script',
    description: 'Edit an existing Lua script in the Defold project',
    parameters: {
      projectPath: { type: 'string', description: 'Path to Defold project directory' },
      scriptName: { type: 'string', description: 'Name of the script (without .lua)' },
      content: { type: 'string', description: 'New script content' }
    }
  },
  {
    name: 'create_lua_module',
    description: 'Create a reusable Lua module',
    parameters: {
      projectPath: { type: 'string', description: 'Path to Defold project directory' },
      moduleName: { type: 'string', description: 'Name of the module (without .lua)' },
      content: { type: 'string', description: 'Module content', default: 'local M = {}\nreturn M\n' }
    }
  },
  {
    name: 'create_collection',
    description: 'Create a new collection in the Defold project',
    parameters: {
      projectPath: { type: 'string', description: 'Path to Defold project directory' },
      collectionName: { type: 'string', description: 'Name of the collection (without .collection)' }
    }
  },
  {
    name: 'add_game_object',
    description: 'Add a game object to a collection',
    parameters: {
      projectPath: { type: 'string', description: 'Path to Defold project directory' },
      collectionName: { type: 'string', description: 'Name of the collection (without .collection)' },
      objectName: { type: 'string', description: 'Name of the game object' },
      position: { type: 'object', description: 'Position {x, y, z}', default: { x: 0, y: 0, z: 0 } }
    }
  },
  {
    name: 'add_component',
    description: 'Add a component (e.g., sprite, script) to a game object',
    parameters: {
      projectPath: { type: 'string', description: 'Path to Defold project directory' },
      collectionName: { type: 'string', description: 'Name of the collection (without .collection)' },
      objectName: { type: 'string', description: 'Name of the game object' },
      componentType: { type: 'string', description: 'Type: sprite, script, collisionobject, etc.' },
      componentPath: { type: 'string', description: 'Path to component resource (e.g., /main/player.script)' }
    }
  },
  {
    name: 'create_sprite',
    description: 'Create a sprite asset and add it to a collection',
    parameters: {
      projectPath: { type: 'string', description: 'Path to Defold project directory' },
      collectionName: { type: 'string', description: 'Name of the collection (without .collection)' },
      spriteName: { type: 'string', description: 'Name of the sprite' },
      imagePath: { type: 'string', description: 'Path to image file (e.g., /assets/player.png)' }
    }
  },
  {
    name: 'create_tilemap',
    description: 'Create a tilemap asset and add it to a collection',
    parameters: {
      projectPath: { type: 'string', description: 'Path to Defold project directory' },
      collectionName: { type: 'string', description: 'Name of the collection (without .collection)' },
      tilemapName: { type: 'string', description: 'Name of the tilemap' },
      tilesourcePath: { type: 'string', description: 'Path to tilesource file (e.g., /assets/tiles.tilesource)' }
    }
  },
  {
    name: 'create_particlefx',
    description: 'Create a particle effect and add it to a collection',
    parameters: {
      projectPath: { type: 'string', description: 'Path to Defold project directory' },
      collectionName: { type: 'string', description: 'Name of the collection (without .collection)' },
      particleName: { type: 'string', description: 'Name of the particle effect' },
      emitterConfig: { type: 'object', description: 'Emitter configuration (e.g., { size: 1, life: 2 })', default: {} }
    }
  },
  {
    name: 'create_sound',
    description: 'Create a sound component and add it to a collection',
    parameters: {
      projectPath: { type: 'string', description: 'Path to Defold project directory' },
      collectionName: { type: 'string', description: 'Name of the collection (without .collection)' },
      soundName: { type: 'string', description: 'Name of the sound' },
      soundFile: { type: 'string', description: 'Path to sound file (e.g., /assets/sound.wav)' }
    }
  },
  {
    name: 'create_camera',
    description: 'Create a camera component and add it to a collection',
    parameters: {
      projectPath: { type: 'string', description: 'Path to Defold project directory' },
      collectionName: { type: 'string', description: 'Name of the collection (without .collection)' },
      cameraName: { type: 'string', description: 'Name of the camera' },
      properties: { type: 'object', description: 'Camera properties (e.g., { fov: 45, near_z: 0.1 })', default: {} }
    }
  },
  {
    name: 'create_factory',
    description: 'Create a factory component for spawning game objects',
    parameters: {
      projectPath: { type: 'string', description: 'Path to Defold project directory' },
      collectionName: { type: 'string', description: 'Name of the collection (without .collection)' },
      factoryName: { type: 'string', description: 'Name of the factory' },
      prototypePath: { type: 'string', description: 'Path to prototype (e.g., /main/enemy.collection)' }
    }
  },
  {
    name: 'create_gui',
    description: 'Create a GUI scene and script',
    parameters: {
      projectPath: { type: 'string', description: 'Path to Defold project directory' },
      guiName: { type: 'string', description: 'Name of the GUI (without .gui)' },
      scriptContent: { type: 'string', description: 'GUI script content', default: '-- GUI script created by Defold MCP\n' }
    }
  },
  {
    name: 'setup_physics',
    description: 'Configure physics for a collision object in a collection',
    parameters: {
      projectPath: { type: 'string', description: 'Path to Defold project directory' },
      collectionName: { type: 'string', description: 'Name of the collection (without .collection)' },
      objectName: { type: 'string', description: 'Name of the game object' },
      collisionType: { type: 'string', description: 'Type: dynamic, static, kinematic', default: 'dynamic' },
      shapeType: { type: 'string', description: 'Shape: box, sphere, capsule', default: 'box' }
    }
  },
  {
    name: 'configure_render',
    description: 'Configure render settings in render.render',
    parameters: {
      projectPath: { type: 'string', description: 'Path to Defold project directory' },
      renderSettings: { type: 'object', description: 'Render settings (e.g., { clear_color: { r: 0, g: 0, b: 0, a: 1 } })' }
    }
  },
  {
    name: 'setup_bob',
    description: 'Locate, configure, or download bob.jar for build operations',
    parameters: {
      defoldPath: { type: 'string', description: 'Path to Defold installation (optional)', default: '' },
      bobPath: { type: 'string', description: 'Custom path to bob.jar (optional)', default: '' },
      defoldVersion: { type: 'string', description: 'Defold version for downloading bob.jar (e.g., 1.9.6)', default: '' }
    }
  },
  {
    name: 'build_project',
    description: 'Build Defold project for a target platform',
    parameters: {
      projectPath: { type: 'string', description: 'Path to Defold project directory' },
      platform: { type: 'string', description: 'Target platform: html5, ios, android, win32, osx, linux' },
      variant: { type: 'string', description: 'Build variant: debug, release', default: 'debug' }
    }
  },
  {
    name: 'bundle_project',
    description: 'Bundle Defold project for distribution',
    parameters: {
      projectPath: { type: 'string', description: 'Path to Defold project directory' },
      platform: { type: 'string', description: 'Target platform: ios, android' },
      outputDir: { type: 'string', description: 'Output directory for bundled files' }
    }
  },
  {
    name: 'debug_logs',
    description: 'Capture and analyze Defold debug logs',
    parameters: {
      projectPath: { type: 'string', description: 'Path to Defold project directory' }
    }
  },
  {
    name: 'stream_logs',
    description: 'Stream real-time debug logs from a running Defold project',
    parameters: {
      projectPath: { type: 'string', description: 'Path to Defold project directory' }
    }
  },
  {
    name: 'enable_hot_reload',
    description: 'Enable hot-reload by watching project files',
    parameters: {
      projectPath: { type: 'string', description: 'Path to Defold project directory' }
    }
  },
  {
    name: 'add_native_extension',
    description: 'Add a native extension to the project',
    parameters: {
      projectPath: { type: 'string', description: 'Path to Defold project directory' },
      extensionUrl: { type: 'string', description: 'URL to extension repository or zip file' }
    }
  },
  {
    name: 'get_project_analytics',
    description: 'Retrieve analytics on project modifications',
    parameters: {
      projectPath: { type: 'string', description: 'Path to Defold project directory' }
    }
  }
];

const DEFOLD_PATH = process.env.DEFOLD_PATH || '/Applications/Defold.app/Contents/MacOS/Defold';
console.error(`DEFOLD_PATH: ${DEFOLD_PATH}`);
let BOB_PATH = process.env.BOB_PATH || null;
console.error(`BOB_PATH: ${BOB_PATH}`);
const BOB_DOWNLOAD_URL = 'https://github.com/defold/defold/releases/download';
console.error(`BOB_DOWNLOAD_URL: ${BOB_DOWNLOAD_URL}`);

class DefoldMCPServer {
  constructor() {
    console.error('Constructing DefoldMCPServer');
    this.logStreams = new Map();
    this.watchers = new Map();
    this.analytics = new Map();
    this.bobInitialized = false;
    
    // Create the MCP server
    this.server = new Server(
      SERVER_INFO,
      {
        capabilities: {
          tools: { listChanged: false }
        }
      }
    );
    
    // Set up request handlers for the standard MCP protocol endpoints
    this.setupRequestHandlers();
  }
  
  setupRequestHandlers() {
    // Handle tools/list
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      console.error('Handling tools/list request');
      return {
        tools: TOOLS.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: {
            type: 'object',
            properties: Object.fromEntries(
              Object.entries(tool.parameters || {}).map(([key, param]) => [
                key, 
                { type: param.type, description: param.description }
              ])
            ),
            required: Object.entries(tool.parameters || {})
              .filter(([_, param]) => !param.optional)
              .map(([key, _]) => key)
          }
        }))
      };
    });
    
    // Handle tools/call
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        console.error(`Handling tools/call request for tool: ${name}`);
        
        if (['build_project', 'bundle_project', 'add_native_extension', 'setup_bob'].includes(name)) {
          await this.ensureBobInitialized();
        }
        
        // Call the appropriate tool handler
        const result = await this.callTool(name, args);
        return {
          content: result.content
        };
      } catch (error) {
        console.error(`Error handling tools/call: ${error.message}`);
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
          isError: true
        };
      }
    });
  }
  
  async callTool(name, args) {
    switch (name) {
      case 'launch_defold':
        return await this.launchDefold(args.projectPath);
      case 'run_project':
        return await this.runProject(args.projectPath);
      case 'create_project':
        return await this.createProject(args.projectPath, args.projectName);
      case 'list_projects':
        return await this.listProjects(args.directory);
      case 'get_project_settings':
        return await this.getProjectSettings(args.projectPath);
      case 'update_project_settings':
        return await this.updateProjectSettings(args.projectPath, args.settings);
      case 'create_script':
        return await this.createScript(args.projectPath, args.scriptName, args.scriptType, args.content);
      case 'edit_script':
        return await this.editScript(args.projectPath, args.scriptName, args.content);
      case 'create_lua_module':
        return await this.createLuaModule(args.projectPath, args.moduleName, args.content);
      case 'create_collection':
        return await this.createCollection(args.projectPath, args.collectionName);
      case 'add_game_object':
        return await this.addGameObject(args.projectPath, args.collectionName, args.objectName, args.position);
      case 'add_component':
        return await this.addComponent(args.projectPath, args.collectionName, args.objectName, args.componentType, args.componentPath);
      case 'create_sprite':
        return await this.createSprite(args.projectPath, args.collectionName, args.spriteName, args.imagePath);
      case 'create_tilemap':
        return await this.createTilemap(args.projectPath, args.collectionName, args.tilemapName, args.tilesourcePath);
      case 'create_particlefx':
        return await this.createParticlefx(args.projectPath, args.collectionName, args.particleName, args.emitterConfig);
      case 'create_sound':
        return await this.createSound(args.projectPath, args.collectionName, args.soundName, args.soundFile);
      case 'create_camera':
        return await this.createCamera(args.projectPath, args.collectionName, args.cameraName, args.properties);
      case 'create_factory':
        return await this.createFactory(args.projectPath, args.collectionName, args.factoryName, args.prototypePath);
      case 'create_gui':
        return await this.createGui(args.projectPath, args.guiName, args.scriptContent);
      case 'setup_physics':
        return await this.setupPhysics(args.projectPath, args.collectionName, args.objectName, args.collisionType, args.shapeType);
      case 'configure_render':
        return await this.configureRender(args.projectPath, args.renderSettings);
      case 'setup_bob':
        return await this.setupBob(args.defoldPath, args.bobPath, args.defoldVersion);
      case 'build_project':
        return await this.buildProject(args.projectPath, args.platform, args.variant);
      case 'bundle_project':
        return await this.bundleProject(args.projectPath, args.platform, args.outputDir);
      case 'debug_logs':
        return await this.debugLogs(args.projectPath);
      case 'stream_logs':
        return await this.streamLogs(args.projectPath);
      case 'enable_hot_reload':
        return await this.enableHotReload(args.projectPath);
      case 'add_native_extension':
        return await this.addNativeExtension(args.projectPath, args.extensionUrl);
      case 'get_project_analytics':
        return await this.getProjectAnalytics(args.projectPath);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }
  
  async start() {
    console.error('Starting server');
    // Choose transport based on environment
    if (MCP_TRANSPORT === 'stdio') {
      console.error('Starting Defold MCP Server on stdio');
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error('Stdio connection established');
    } else {
      console.error(`Starting Defold MCP Server on ws://${MCP_HOST}:${MCP_PORT}`);
      throw new Error('WebSocket transport not yet implemented with MCP SDK');
    }
  }
  
  async ensureBobInitialized() {
    if (!this.bobInitialized) {
      await this.initializeBobPath();
      this.bobInitialized = true;
    }
  }

  async initializeBobPath() {
    console.error('Initializing bob.jar path');
    if (BOB_PATH) return;
    const possiblePaths = [
      path.join(path.dirname(DEFOLD_PATH), 'Contents', 'Resources', 'bob.jar'),
      path.join(os.homedir(), 'defold', 'bob.jar'),
      '/usr/local/bin/bob.jar'
    ];
    for (const p of possiblePaths) {
      try {
        await fs.access(p);
        if (await this.validateBobJar(p)) {
          BOB_PATH = p;
          console.error(`Found bob.jar at ${BOB_PATH}`);
          return;
        }
      } catch {}
    }
    console.warn('bob.jar not found. Use setup_bob tool with defoldVersion (e.g., 1.9.6) to download from GitHub.');
  }

  async validateBobJar(bobPath) {
    console.error(`Validating bob.jar at ${bobPath}`);
    try {
      const output = execSync(`java -jar "${bobPath}" --version`, { encoding: 'utf8' });
      if (!output.includes('bob.jar')) {
        throw new Error('Invalid bob.jar');
      }
      const javaVersion = execSync('java -version 2>&1', { encoding: 'utf8' });
      if (!javaVersion.includes('21.')) {
        throw new Error('OpenJDK 21 required. Install with: brew install openjdk@21');
      }
      return true;
    } catch (error) {
      console.warn(`bob.jar validation failed at ${bobPath}: ${error.message}`);
      return false;
    }
  }

  async downloadBobJar(version, targetPath) {
    console.error(`Downloading bob.jar version ${version} to ${targetPath}`);
    const url = `${BOB_DOWNLOAD_URL}/${version}/bob.jar`;
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    return new Promise((resolve, reject) => {
      const fileStream = require('fs').createWriteStream(targetPath);
      const request = https.get(url, (res) => {
        if (res.statusCode !== 200) {
          fileStream.close();
          reject(new Error(`Failed to download bob.jar: HTTP ${res.statusCode}`));
          return;
        }
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve();
        });
      }).on('error', (error) => {
        fileStream.close();
        reject(error);
      });
      request.end();
    });
  }

  // Implement all the tool handlers here
  async launchDefold(projectPath) {
    try {
      let resolvedPath = path.resolve(projectPath);
      
      // Ensure the path ends with game.project
      if (!resolvedPath.endsWith('game.project')) {
        // Check if it's a directory
        const stats = await fs.stat(resolvedPath);
        if (stats.isDirectory()) {
          resolvedPath = path.join(resolvedPath, 'game.project');
        } else {
          // Not a directory and doesn't end with game.project
          throw new Error('Project path must be either a directory or a path to game.project file');
        }
      }
      
      // Verify the game.project file exists
      try {
        await fs.access(resolvedPath);
        console.error(`Found game.project at: ${resolvedPath}`);
      } catch (accessError) {
        console.error(`game.project not found at: ${resolvedPath}`);
        throw new Error(`Cannot find game.project at: ${resolvedPath}`);
      }
      
      console.error(`Launching Defold with path: ${resolvedPath}`);
      const cmd = `"${DEFOLD_PATH}" "${resolvedPath}"`;
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error launching Defold: ${error.message}`);
        }
        if (stderr) {
          console.error(`Defold stderr: ${stderr}`);
        }
        if (stdout) {
          console.error(`Defold stdout: ${stdout}`);
        }
      });
      return { content: [{ type: 'text', text: `Defold editor launched` }] };
    } catch (error) {
      console.error(`Error launching Defold: ${error.message}`);
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }
  }

  async runProject(projectPath) {
    try {
      const cmd = `"${DEFOLD_PATH}" --config debug=true "${path.resolve(projectPath)}"`;
      const child = spawn(cmd, { shell: true, stdio: 'pipe' });
      const logStream = new Writable({
        write(chunk, encoding, callback) {
          console.error(`Defold log: ${chunk.toString()}`);
          callback();
        }
      });
      child.stdout.pipe(logStream);
      child.stderr.pipe(logStream);
      this.logStreams.set(projectPath, child);
      return { content: [{ type: 'text', text: 'Project running with debug output' }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }
  }

  async createProject(projectPath, projectName) {
    try {
      const dir = path.resolve(projectPath);
      await fs.mkdir(dir, { recursive: true });
      const gameProjectContent = `[project]
title = ${projectName}
dependencies = 
version = 1.0
`;
      await fs.writeFile(path.join(dir, 'game.project'), gameProjectContent);
      await fs.mkdir(path.join(dir, 'main'));
      await fs.writeFile(path.join(dir, 'main/main.collection'), '');
      return { content: [{ type: 'text', text: `Project ${projectName} created at ${dir}` }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }
  }

  async listProjects(directory) {
    try {
      const dir = path.resolve(directory);
      const files = await fs.readdir(dir, { withFileTypes: true });
      const projects = [];
      for (const file of files) {
        if (file.isDirectory()) {
          const projectFile = path.join(dir, file.name, 'game.project');
          try {
            await fs.access(projectFile);
            projects.push(file.name);
          } catch {}
        }
      }
      return { content: [{ type: 'text', text: `Found ${projects.length} projects:\n${projects.join('\n')}` }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }
  }

  // Add the rest of your tool implementations here
  // Each method should return { content: [{ type: 'text', text: 'result' }] }
  // For errors, return { content: [{ type: 'text', text: 'Error message' }], isError: true }
  
  // For example:
  async getProjectSettings(projectPath) {
    try {
      const projectFile = path.join(path.resolve(projectPath), 'game.project');
      const content = await fs.readFile(projectFile, 'utf8');
      const settings = ini.parse(content);
      return { content: [{ type: 'text', text: JSON.stringify(settings, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }
  }
  
  // Continue implementing the other tool methods...
}

// Start the server
async function main() {
  const server = new DefoldMCPServer();
  console.error('Server instance created');
  try {
    await server.start();
    console.error('Server start completed');
  } catch (error) {
    console.error('Server start error:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
