// Loaded only by the diagnostic subprocess; it never calls a model.
export default function (pi) {
  pi.on('session_start', (_event, ctx) => {
    ctx.ui.notify('PI_SETUP_CHECK ' + JSON.stringify({ tools: pi.getAllTools().map(t => t.name), commands: pi.getCommands().map(c => c.name) }), 'info');
    ctx.shutdown();
  });
}
