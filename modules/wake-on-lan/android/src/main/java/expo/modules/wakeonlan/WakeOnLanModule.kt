package expo.modules.wakeonlan

import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.Inet4Address
import java.net.InetAddress

/**
 * Wake-on-LAN sihirli paketini UDP ile gönderen küçük yerel modül.
 * Paket 6 bayt 0xFF ve ardından hedef MAC adresinin 16 kez tekrarından oluşur; 9 ve 7 numaralı portlara gönderilir.
 * Yalnızca özel (yerel) IPv4 adreslerine ve genel yayın adresine (255.255.255.255) gönderim yapılır; internete hiçbir paket çıkmaz.
 */
class WakeOnLanModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("WakeOnLan")

    AsyncFunction("sendMagicPacket") { mac: String, addresses: List<String> ->
      val macBytes = parseMac(mac) ?: throw InvalidArgumentException("Invalid MAC address: $mac")
      val packet = ByteArray(6 + 16 * 6)
      for (i in 0 until 6) packet[i] = 0xFF.toByte()
      for (i in 1..16) System.arraycopy(macBytes, 0, packet, i * 6, 6)

      // Bir adrese gönderim başarısız olsa bile (ör. genel yayın adresine yol yoksa) diğer adresleri deniyoruz; hiçbirine gönderilemezse hata veriyoruz.
      var sent = 0
      var lastError: Exception? = null
      DatagramSocket().use { socket ->
        socket.broadcast = true
        for (address in addresses) {
          val target = InetAddress.getByName(address)
          if (target !is Inet4Address || !(target.isSiteLocalAddress || address == "255.255.255.255")) {
            throw InvalidArgumentException("Not a local IPv4 address: $address")
          }
          for (port in intArrayOf(9, 7)) {
            try {
              socket.send(DatagramPacket(packet, packet.size, target, port))
              sent++
            } catch (e: Exception) {
              lastError = e
            }
          }
        }
      }
      if (sent == 0) throw SendFailedException(lastError)
    }
  }

  private fun parseMac(mac: String): ByteArray? {
    val hex = mac.replace(":", "").replace("-", "")
    if (!Regex("^[0-9a-fA-F]{12}$").matches(hex)) return null
    return ByteArray(6) { i -> hex.substring(i * 2, i * 2 + 2).toInt(16).toByte() }
  }
}

private class InvalidArgumentException(message: String) : CodedException(message)

private class SendFailedException(cause: Exception?) : CodedException("Magic packet could not be sent", cause)