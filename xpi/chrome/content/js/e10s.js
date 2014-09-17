
function handleMessageFromChrome(msg) {
	var url = msg.data.url;
	content.document.location.href = url;
}

addMessageListener('superstart@enjoyfreeware.org:load-url', handleMessageFromChrome);
