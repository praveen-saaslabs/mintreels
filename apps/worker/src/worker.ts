async function main(): Promise<void> {
  // TODO: createProcessors() and start BullMQ workers
  console.log('MintReels worker skeleton is running. Job processors are not implemented yet.');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Worker failed to start';
  console.error(message);
  process.exitCode = 1;
});
