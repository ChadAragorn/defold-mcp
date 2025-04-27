# defold-mcp

> **Note:** This is my first attempt at creating an MCP (Model Context Protocol) server. It is not perfect, in fact it's missing a lot of functions, but I hope someone smarter than me can take what I've started and really run with it!

---

## 🚀 What is defold-mcp?

defold-mcp is an open-source Model Context Protocol (MCP) server designed to bridge the [Defold](https://defold.com) game engine with modern developer tools and AI-powered workflows. It provides a set of powerful tools to automate, inspect, and manage Defold projects programmatically, making it easier for developers to:

- Launch and debug Defold projects
- Generate and edit Lua scripts and modules
- Create collections, sprites, tilemaps, and more
- Manage project settings and dependencies
- Enable hot-reloading and real-time analytics
- Integrate with tools like [Cursor](https://www.cursor.so/) for AI-assisted game development

## ✨ Features

- **Comprehensive Toolset:** Exposes a wide range of Defold project operations as MCP tools (see below for the full list).
- **Apple Silicon & Dotenv Support:** Works out-of-the-box on Apple Silicon Macs and supports environment configuration via `.env` files.
- **Automated Project Management:** Easily create, list, and configure Defold projects from the command line or through compatible clients.
- **Script & Asset Automation:** Programmatically generate scripts, collections, sprites, and more.
- **Debug & Analytics:** Run projects in debug mode, capture console output, and retrieve analytics on project modifications.
- **Extensible:** Built for others to improve, extend, and adapt for new workflows.

## 🛠️ Provided Tools

defold-mcp exposes the following MCP tools:

- `launch_defold`: Launch the Defold editor for a project
- `run_project`: Run a Defold project in debug mode and capture output
- `create_project`: Create a new Defold project with a basic structure
- `list_projects`: List all Defold projects in a directory
- `get_project_settings`: Read settings from `game.project`
- `update_project_settings`: Update settings in `game.project`
- `create_script`: Create a new Lua script
- `edit_script`: Edit an existing Lua script
- `create_lua_module`: Create a reusable Lua module
- `create_collection`: Create a new collection
- `add_game_object`: Add a game object to a collection
- `add_component`: Add a component (sprite, script, etc.) to a game object
- `create_sprite`: Create and add a sprite asset
- `create_tilemap`: Create and add a tilemap asset
- `create_particlefx`: Create and add a particle effect
- `create_camera`: Create and add a camera component
- `create_factory`: Create a factory component for spawning game objects
- `create_gui`: Create a GUI scene and script
- `setup_physics`: Configure physics for a collision object
- `build_project`: Build the project for a target platform
- `enable_hot_reload`: Enable hot-reload by watching project files
- `add_native_extension`: Add a native extension
- `get_project_analytics`: Retrieve analytics on project modifications

...and more! See `index.js` for the full list and details.

## ⚡️ Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/defold-mcp.git
   cd defold-mcp
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Configure environment (optional):**
   Create a `.env` file to override defaults (see `index.js` for variables like `DEFOLD_PATH`, `MCP_PORT`, etc).
4. **Run the server:**
   ```bash
   node index.js
   ```
5. **Connect with your favorite MCP-compatible client** (such as [Cursor](https://www.cursor.so/)).

---

### 🛠️ Using with Cursor or Windsurf

If you are using [Cursor](https://www.cursor.so/) or [Windsurf](https://windsurf.ai/), you **do not need to manually run the server**. Instead, add a configuration file to your project at `.cursor/mcp.json` to let your client automatically launch and manage the server for you.

Here's an example configuration:

```json
{
  "mcpServers": {
    "defold-mcp": {
      "command": "/path/to/your/node/binary", // e.g., ~/.nvm/versions/node/v22.14.0/bin/node
      "args": ["/path/to/where/you/cloned/defold-mcp/index.js"], // e.g., ~/git/defold-mcp/index.js
      "env": {
        "MCP_TRANSPORT": "stdio",
        "DEFOLD_PATH": "/Applications/Defold.app/Contents/MacOS/Defold",
        "MCP_PORT": "3000",
        "MCP_HOST": "localhost",
        "BOB_PATH": "/desired/path/for/bob.jar" // e.g., ~/defold/bob-1.9.6.jar
      }
    }
  }
}
```

- **`command`**: Path to your Node.js binary. You can find this by running `which node` in your terminal.
- **`args`**: Path to the `index.js` file of this project, wherever you cloned it.
- **`BOB_PATH`**: Path where you want the Defold `bob.jar` file to be installed or found.

This allows Cursor or Windsurf to automatically start, stop, and connect to the `defold-mcp` server whenever you open your project. Just adjust the paths and environment variables as needed for your setup.

## 💡 Why This Project?

I created defold-mcp as my first experiment in building an MCP server and integrating it with the Defold game engine. My goal was to make Defold more accessible to automation and AI-driven workflows. I know there are rough edges and things that could be done better, but I hope this project inspires others to contribute, improve, and take it much further!

If you see ways to make it better, please fork, contribute, or reach out. Let's build something awesome for the Defold community together.

## 🤝 Contributing

Contributions, bug reports, and feature requests are all welcome! Please open an issue or submit a pull request.

## 📄 License

This project is [MIT licensed](LICENSE).

---

*Created with curiosity and a love for game development.*
