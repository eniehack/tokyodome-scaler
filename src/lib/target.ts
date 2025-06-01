export const targets = [
	{
		id: 'tokyodome',
		name: '東京ドーム',
		src: 'tokyodome.json'
	},
	{
		id: 'vatican',
		name: 'バチカン市国',
		src: 'vatican.json'
	}
] as const;

export const getTargetPath = (target: string) => {
	const t = targets.find((val) => val.id === target);
	if (typeof t !== 'undefined') return t;
	return targets[0];
};
