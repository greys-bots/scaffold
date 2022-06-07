module.exports = {
	numbers: ["0️⃣","1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"],
	confirmReacts: ['✅','❌'],
	confirmVals: [['y', 'yes', '✅'], ['n', 'no', '❌']],
	confirmBtns: [['yes', 'clear'], ['no', 'cancel']],
	pageBtns: (ind, len) => {
		return [
			{
				type: 2,
				emoji: '⏮️',
				style: 1,
				custom_id: 'first'
			},
			{
				type: 2,
				emoji: '◀️',
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
				emoji: '▶️',
				style: 1,
				custom_id: 'next'
			},
			{
				type: 2,
				emoji: '⏭️',
				style: 1,
				custom_id: 'last'
			}
		]
	},
}