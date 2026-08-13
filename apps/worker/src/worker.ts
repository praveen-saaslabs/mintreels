async function main(): Promise<void> {
  // TODO: createProcessors() and start BullMQ workers
  console.log('MintReels worker skeleton is running. Job processors are not implemented yet.');
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Worker failed to start';
  console.error(message);
  process.exitCode = 1;
});

// Keep the process alive under docker / node --watch until processors are wired.
setInterval(() => undefined, 60_000);
