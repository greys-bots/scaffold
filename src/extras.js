export const numbers = ["0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"]
export const confirmReacts = ['✅', '❌']
export const confirmVals = [['y', 'yes', '✅'], ['n', 'no', '❌']]
export const confirmBtns = [['yes', 'clear'], ['no', 'cancel']]
export function pageBtns(ind, len) {
	return [
		{
			type: 2,
			emoji: { name: '⏮️' },
			style: 1,
			custom_id: 'first'
		},
		{
			type: 2,
			emoji: { name: '◀️' },
			style: 1,
			custom_id: 'prev'
		},
		{
			type: 2,
			label: `page ${ind}/${len}`,
			style: 2,
			custom_id: 'page',
			disabled: true
		},
		{
			type: 2,
			emoji: { name: '▶️' },
			style: 1,
			custom_id: 'next'
		},
		{
			type: 2,
			emoji: { name: '⏭️' },
			style: 1,
			custom_id: 'last'
		}
	]
}

export default {
	numbers,
	confirmReacts,
	confirmVals,
	confirmBtns,
	pageBtns,
}